import {
    Camera,
    Color,
    Layers,
    Material,
    Mesh,
    MeshRenderer,
    Node,
    primitives,
    SkeletalAnimation,
    tween,
    utils,
    Vec3,
} from 'cc';

import {
    BattlePresentationEvent,
    BattleUnitSnapshot,
} from './BattlePresentationTypes';
import type { BattlePresentationAdapter } from './BattlePresentationDirector';
import {
    getBattlePetVisualProfile,
    type BattlePetFallbackArchetype,
} from './BattlePetVisualRegistry';
import BattlePetAssetLoader from './BattlePetAssetLoader';
import {
    resolveBattleQualityProfile,
    type BattleQualityProfile,
} from './BattleQualityPolicy';

type UnitVisual = {
    root: Node;
    modelRoot: Node;
    home: Vec3;
    side: 'left' | 'right';
    baseScale: number;
    speciesCode: string;
    animation: SkeletalAnimation | null;
    formal: boolean;
};

export type BattleStageDiagnostics = {
    qualityTier: string;
    targetFps: number;
    playedEvents: number;
    formalUnits: number;
    fallbackUnits: number;
    skippedEffects: number;
    maxConcurrentEffects: number;
    assetValidationReports: ReturnType<BattlePetAssetLoader['getValidationReports']>;
};

type CameraState = {
    camera: Camera;
    priority: number;
    clearFlags: number;
};

const LEFT_POSITIONS = [
    new Vec3(-2.35, 0, 2.55),
    new Vec3(0, 0, 2.88),
    new Vec3(2.35, 0, 2.55),
    new Vec3(-1.2, 0, 1.35),
    new Vec3(1.2, 0, 1.35),
];

const RIGHT_POSITIONS = [
    new Vec3(2.35, 0, -2.55),
    new Vec3(0, 0, -2.88),
    new Vec3(-2.35, 0, -2.55),
    new Vec3(1.2, 0, -1.35),
    new Vec3(-1.2, 0, -1.35),
];

const ALLY_COLORS = [
    new Color(250, 184, 96, 255),
    new Color(121, 178, 155, 255),
    new Color(188, 157, 235, 255),
    new Color(245, 157, 183, 255),
    new Color(114, 178, 224, 255),
];

const ENEMY_COLORS = [
    new Color(197, 93, 102, 255),
    new Color(137, 96, 157, 255),
    new Color(198, 125, 81, 255),
    new Color(104, 131, 151, 255),
    new Color(147, 102, 83, 255),
];

export default class Battle3DStage implements BattlePresentationAdapter {
    readonly available: boolean;
    readonly failureReason: string;

    private readonly unitVisuals = new Map<string, UnitVisual>();
    private readonly materials = new Map<string, Material>();
    private readonly meshes = new Map<string, Mesh>();
    private readonly cameraStates: CameraState[] = [];
    private readonly assetLoader = new BattlePetAssetLoader();
    private worldRoot: Node | null = null;
    private unitRoot: Node | null = null;
    private cameraNode: Node | null = null;
    private camera: Camera | null = null;
    private teamSignature = '';
    private initializationStep = 'not-started';
    private activeTransientEffects = 0;
    private maxConcurrentEffects = 0;
    private skippedEffects = 0;
    private playedEvents = 0;
    private formalUnits = 0;
    private fallbackUnits = 0;

    constructor(
        private readonly ownerLayer: Node,
        private readonly quality: BattleQualityProfile = resolveBattleQualityProfile(),
    ) {
        let available = false;
        let failureReason = '';
        try {
            available = this.buildWorld();
        } catch (error) {
            failureReason = `${this.initializationStep}: ${error instanceof Error ? error.stack || error.message : String(error)}`;
            console.warn('[Battle3DStage] initialization failed; using 2D fallback.', error);
            this.restoreUiCameras();
            if (this.worldRoot?.isValid) this.worldRoot.destroy();
            this.worldRoot = null;
            this.unitRoot = null;
            this.cameraNode = null;
            this.camera = null;
        }
        this.available = available;
        this.failureReason = failureReason;
    }

    sync(leftTeam: BattleUnitSnapshot[], rightTeam: BattleUnitSnapshot[]) {
        if (!this.available || !this.unitRoot?.isValid) return;
        const left = Array.isArray(leftTeam) ? leftTeam.slice(0, 5) : [];
        const right = Array.isArray(rightTeam) ? rightTeam.slice(0, 5) : [];
        const signature = [...left, ...right]
            .map((unit) => `${unit.id}:${unit.speciesCode || ''}`)
            .join('|');
        if (signature !== this.teamSignature) {
            this.teamSignature = signature;
            this.unitRoot.destroyAllChildren();
            this.unitVisuals.clear();
            this.formalUnits = 0;
            this.fallbackUnits = 0;
            left.forEach((unit, index) => this.createUnit(unit, 'left', index));
            right.forEach((unit, index) => this.createUnit(unit, 'right', index));
        }

        [...left, ...right].forEach((unit) => {
            const visual = this.unitVisuals.get(String(unit.id));
            if (!visual?.root?.isValid) return;
            const alive = unit.alive !== false && Number(unit.hp || 0) > 0;
            visual.root.active = alive;
            if (alive && visual.root.scale.y < 0.2) {
                visual.root.setScale(visual.baseScale, visual.baseScale, visual.baseScale);
                visual.root.setRotationFromEuler(0, visual.side === 'left' ? 180 : 0, 0);
            }
        });
    }

    async play(event: BattlePresentationEvent, speed: number) {
        if (!this.available || !this.worldRoot?.isValid) return;
        this.playedEvents += 1;
        const duration = (milliseconds: number) => milliseconds / Math.max(0.5, speed);
        const actor = this.unitVisuals.get(String(event.actorId || ''));
        const target = this.unitVisuals.get(String(event.targetId || ''));

        switch (event.presentationCue) {
            case 'round.start':
                await this.pulse(this.unitRoot, duration(170), 1.018);
                return;
            case 'damage.hit':
                this.playUnitAnimation(actor, event.skillCode || event.skillName ? 'active_skill' : 'basic_attack');
                this.playUnitAnimation(target, 'hit', false);
                await this.attackAndHit(actor, target, duration(360), Boolean(event.critical));
                return;
            case 'status.tick':
                await this.hit(target, duration(210), false);
                return;
            case 'support.heal':
                this.playUnitAnimation(actor, 'active_skill');
                await this.supportPulse(target, duration(320), 'heal');
                return;
            case 'support.shield':
                this.playUnitAnimation(actor, 'active_skill');
            case 'shield.absorb':
                await this.supportPulse(target, duration(280), 'shield');
                return;
            case 'status.apply':
            case 'status.cleanse':
                await this.pulse(target?.root, duration(240), 1.13);
                return;
            case 'reaction.trigger':
                await Promise.all([
                    this.pulse(target?.root, duration(260), 1.16),
                    this.cameraPunch(duration(260), 0.15),
                ]);
                return;
            case 'formation.ultimate':
                await this.ultimate(event.side || 'left', duration(620));
                return;
            case 'boss.telegraph':
                await this.bossTelegraph(actor, duration(820));
                return;
            case 'boss.skill':
                this.playUnitAnimation(actor, 'active_skill');
                await this.bossSkill(actor, duration(720));
                return;
            case 'boss.phase':
                await Promise.all([
                    this.pulse(actor?.root, duration(520), 1.22),
                    this.cameraPunch(duration(520), 0.24),
                ]);
                return;
            case 'unit.death':
                this.playUnitAnimation(target, 'death', false);
                await this.defeat(target, duration(420));
                return;
            case 'unit.revive':
            case 'unit.survive':
                await this.revive(target, duration(420));
                this.playUnitAnimation(target, 'idle', false);
                return;
            case 'battle.finish':
                for (const visual of this.unitVisuals.values()) {
                    if (visual.root.active) this.playUnitAnimation(visual, 'victory', false);
                }
                await this.pulse(this.unitRoot, duration(260), 1.025);
                return;
            default:
                await this.delay(duration(45));
        }
    }

    applyFinalState() {}

    reset() {
        for (const visual of this.unitVisuals.values()) {
            if (!visual.root?.isValid) continue;
            visual.root.active = true;
            visual.root.setPosition(visual.home);
            visual.root.setScale(visual.baseScale, visual.baseScale, visual.baseScale);
            visual.root.setRotationFromEuler(0, visual.side === 'left' ? 180 : 0, 0);
            visual.modelRoot.setPosition(Vec3.ZERO);
            visual.modelRoot.setScale(Vec3.ONE);
            visual.modelRoot.setRotationFromEuler(0, 0, 0);
            this.playUnitAnimation(visual, 'idle', false);
        }
    }

    getDiagnostics(): BattleStageDiagnostics {
        return {
            qualityTier: this.quality.tier,
            targetFps: this.quality.targetFps,
            playedEvents: this.playedEvents,
            formalUnits: this.formalUnits,
            fallbackUnits: this.fallbackUnits,
            skippedEffects: this.skippedEffects,
            maxConcurrentEffects: this.maxConcurrentEffects,
            assetValidationReports: this.assetLoader.getValidationReports(),
        };
    }

    dispose() {
        this.restoreUiCameras();
        if (this.worldRoot?.isValid) this.worldRoot.destroy();
        for (const material of this.materials.values()) {
            if (material?.isValid) material.destroy();
        }
        for (const mesh of this.meshes.values()) {
            if (mesh?.isValid) mesh.destroy();
        }
        this.materials.clear();
        this.meshes.clear();
        this.worldRoot = null;
        this.unitRoot = null;
        this.cameraNode = null;
        this.camera = null;
        this.unitVisuals.clear();
        this.assetLoader.clear();
        this.activeTransientEffects = 0;
    }

    private buildWorld() {
        this.initializationStep = 'resolve-scene';
        const scene = this.ownerLayer.scene;
        if (!scene) return false;

        this.initializationStep = 'remove-existing-stage';
        const existing = scene.getChildByName('Battle3DVerticalSlice');
        if (existing?.isValid) existing.destroy();

        this.initializationStep = 'collect-ui-cameras';
        const sceneCameras = scene.getComponentsInChildren('cc.Camera') as Camera[];
        for (const camera of sceneCameras) {
            if ((camera.visibility & Layers.BitMask.UI_2D) === 0) continue;
            this.cameraStates.push({
                camera,
                priority: camera.priority,
                clearFlags: camera.clearFlags,
            });
            camera.priority = Math.max(2, camera.priority);
            camera.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
        }

        this.initializationStep = 'create-world-root';
        const root = new Node('Battle3DVerticalSlice');
        root.layer = Layers.BitMask.DEFAULT;
        scene.addChild(root);
        this.worldRoot = root;

        this.initializationStep = 'create-stage-camera';
        const cameraNode = new Node('Battle3DCamera');
        cameraNode.layer = Layers.BitMask.DEFAULT;
        root.addChild(cameraNode);
        cameraNode.setPosition(0, 8.7, 11.8);
        cameraNode.lookAt(new Vec3(0, 0.35, 0));
        const camera = cameraNode.addComponent(Camera);
        camera.priority = 0;
        camera.projection = Camera.ProjectionType.PERSPECTIVE;
        camera.fov = 43;
        camera.near = 0.1;
        camera.far = 60;
        camera.visibility = Layers.BitMask.DEFAULT;
        camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        camera.clearColor = new Color(42, 52, 67, 255);
        this.cameraNode = cameraNode;
        this.camera = camera;

        this.initializationStep = 'build-environment';
        this.createEnvironment(root);
        const units = new Node('BattleUnits');
        units.layer = Layers.BitMask.DEFAULT;
        root.addChild(units);
        this.unitRoot = units;
        this.initializationStep = 'ready';
        return true;
    }

    private restoreUiCameras() {
        for (const state of this.cameraStates) {
            if (!state.camera?.isValid) continue;
            state.camera.priority = state.priority;
            state.camera.clearFlags = state.clearFlags;
        }
        this.cameraStates.length = 0;
    }

    private createEnvironment(root: Node) {
        const ground = this.createPrimitive(
            root,
            'BattleGround',
            'plane',
            new Color(105, 139, 114, 255),
        );
        ground.setScale(12, 1, 12);

        const lane = this.createPrimitive(
            root,
            'CenterLane',
            'plane',
            new Color(201, 190, 146, 255),
        );
        lane.setPosition(0, 0.008, 0);
        lane.setScale(6.2, 1, 7.8);

        [...LEFT_POSITIONS, ...RIGHT_POSITIONS].forEach((position, index) => {
            const ally = index < LEFT_POSITIONS.length;
            const pad = this.createPrimitive(
                root,
                `UnitPad_${index}`,
                'torus',
                ally
                    ? new Color(116, 205, 171, 205)
                    : new Color(231, 129, 128, 205),
            );
            pad.setPosition(position.x, 0.035, position.z);
            pad.setScale(1.4, 0.035, 1.4);
        });
    }

    private createUnit(unit: BattleUnitSnapshot, side: 'left' | 'right', index: number) {
        if (!this.unitRoot) return;
        const root = new Node(`Unit_${side}_${unit.id}`);
        root.layer = Layers.BitMask.DEFAULT;
        this.unitRoot.addChild(root);
        const home = (side === 'left' ? LEFT_POSITIONS : RIGHT_POSITIONS)[index] || Vec3.ZERO;
        root.setPosition(home);
        root.setRotationFromEuler(0, side === 'left' ? 180 : 0, 0);

        const modelRoot = new Node('ModelRoot');
        modelRoot.layer = Layers.BitMask.DEFAULT;
        root.addChild(modelRoot);

        const palette = side === 'left' ? ALLY_COLORS : ENEMY_COLORS;
        const color = palette[index % palette.length];
        const profile = getBattlePetVisualProfile(unit.role === 'boss' ? 'BOSS001' : unit.speciesCode);
        this.buildFallbackArchetype(
            modelRoot,
            color,
            profile.fallbackArchetype,
            profile.speciesCode,
        );
        const baseScale = profile.battleScale;
        root.setScale(baseScale, baseScale, baseScale);

        const visual: UnitVisual = {
            root,
            modelRoot,
            home: home.clone(),
            side,
            baseScale,
            speciesCode: profile.speciesCode,
            animation: null,
            formal: false,
        };
        this.unitVisuals.set(String(unit.id), visual);
        this.fallbackUnits += 1;
        this.playUnitAnimation(visual, 'enter');
        void this.upgradeToFormalVisual(String(unit.id), profile);
    }

    private buildFallbackArchetype(
        root: Node,
        color: Color,
        archetype: BattlePetFallbackArchetype,
        speciesCode: string,
    ) {
        if (speciesCode === 'PET001') {
            this.buildFlameTailFox(root);
            return;
        }
        if (speciesCode === 'PET002') this.buildRockshellTurtle(root);
        else if (speciesCode === 'PET008') this.buildForestSpiritDeer(root);
        else if (speciesCode === 'BOSS001' || archetype === 'guardian') this.buildAncientGuardian(root);
        else if (archetype === 'turtle') this.buildTurtle(root, color);
        else if (archetype === 'deer') this.buildDeer(root, color);
        else this.buildFox(root, color);
    }

    private buildFlameTailFox(root: Node) {
        const flameOrange = new Color(230, 103, 38, 255);
        const warmOrange = new Color(247, 145, 54, 255);
        const cream = new Color(255, 235, 194, 255);
        const ember = new Color(211, 63, 28, 255);
        const gold = new Color(255, 190, 55, 255);
        const amber = new Color(126, 71, 24, 255);

        const body = this.createPrimitive(root, 'Body', 'capsule', flameOrange);
        body.setPosition(0, 0.78, 0.08);
        body.setScale(0.52, 0.74, 0.55);
        body.setRotationFromEuler(90, 0, 0);

        const chest = this.createPrimitive(root, 'ChestFur', 'sphere', cream);
        chest.setPosition(0, 1.02, -0.35);
        chest.setScale(0.48, 0.58, 0.3);

        const head = this.createPrimitive(root, 'Head', 'sphere', warmOrange);
        head.setPosition(0, 1.58, -0.2);
        head.setScale(0.58, 0.55, 0.54);

        const muzzle = this.createPrimitive(root, 'Muzzle', 'sphere', cream);
        muzzle.setPosition(0, 1.48, -0.66);
        muzzle.setScale(0.32, 0.23, 0.24);

        [-0.32, 0.32].forEach((x, index) => {
            const ear = this.createPrimitive(root, `Ear_${index}`, 'cone', ember);
            ear.setPosition(x, 2.06, -0.18);
            ear.setScale(0.27, 0.54, 0.24);
            const inner = this.createPrimitive(root, `EarInner_${index}`, 'cone', cream);
            inner.setPosition(x, 2.04, -0.34);
            inner.setScale(0.14, 0.34, 0.1);
        });

        [-0.28, 0.28].forEach((x, index) => {
            const eye = this.createPrimitive(root, `Eye_${index}`, 'sphere', amber);
            eye.setPosition(x, 1.66, -0.67);
            eye.setScale(0.12, 0.16, 0.07);
        });

        const foreheadFlame = this.createPrimitive(root, 'ForeheadFlameMark', 'cone', cream);
        foreheadFlame.setPosition(0, 1.92, -0.69);
        foreheadFlame.setScale(0.12, 0.24, 0.05);
        foreheadFlame.setRotationFromEuler(90, 0, 0);

        [-0.29, 0.29].forEach((x, index) => {
            const frontLeg = this.createPrimitive(root, `FrontLeg_${index}`, 'capsule', flameOrange);
            frontLeg.setPosition(x, 0.35, -0.34);
            frontLeg.setScale(0.16, 0.48, 0.17);
            const backLeg = this.createPrimitive(root, `BackLeg_${index}`, 'capsule', flameOrange);
            backLeg.setPosition(x, 0.34, 0.35);
            backLeg.setScale(0.19, 0.45, 0.2);
        });

        const tailBase = this.createPrimitive(root, 'TailBase', 'capsule', warmOrange);
        tailBase.setPosition(0.5, 0.82, 0.42);
        tailBase.setScale(0.28, 0.62, 0.29);
        tailBase.setRotationFromEuler(18, 0, -52);
        const tailMid = this.createPrimitive(root, 'TailFlameMid', 'capsule', gold);
        tailMid.setPosition(0.88, 1.22, 0.5);
        tailMid.setScale(0.31, 0.64, 0.31);
        tailMid.setRotationFromEuler(12, 0, -24);
        const tailTip = this.createPrimitive(root, 'TailFlameTip', 'cone', ember);
        tailTip.setPosition(0.99, 1.78, 0.5);
        tailTip.setScale(0.3, 0.66, 0.3);
        tailTip.setRotationFromEuler(0, 0, 10);

        const chestAccent = this.createPrimitive(root, 'ChestFlameAccent', 'cone', gold);
        chestAccent.setPosition(0, 1.1, -0.66);
        chestAccent.setScale(0.1, 0.22, 0.05);
        chestAccent.setRotationFromEuler(90, 0, 0);
    }

    private async upgradeToFormalVisual(unitId: string, profile: ReturnType<typeof getBattlePetVisualProfile>) {
        const loaded = await this.assetLoader.instantiate(profile);
        const visual = this.unitVisuals.get(unitId);
        if (!loaded || !visual?.root?.isValid) {
            if (loaded?.node?.isValid) loaded.node.destroy();
            return;
        }
        visual.modelRoot.destroyAllChildren();
        visual.modelRoot.addChild(loaded.node);
        this.setLayerRecursively(loaded.node, Layers.BitMask.DEFAULT);
        visual.animation = loaded.animation;
        if (!visual.formal) {
            visual.formal = true;
            this.formalUnits += 1;
            this.fallbackUnits = Math.max(0, this.fallbackUnits - 1);
        }
        this.playUnitAnimation(visual, 'enter');
    }

    private setLayerRecursively(node: Node, layer: number) {
        node.layer = layer;
        node.children.forEach((child) => this.setLayerRecursively(child, layer));
    }

    private playUnitAnimation(
        visual: UnitVisual | undefined,
        clipName: string,
        returnToIdle = true,
    ) {
        const animation = visual?.animation;
        if (!animation?.isValid) {
            this.playProceduralAnimation(visual, clipName, returnToIdle);
            return;
        }
        const clip = animation.clips.find((item) => item?.name === clipName);
        if (!clip) return;
        animation.crossFade(clipName, 0.08);
        if (!returnToIdle || clipName === 'idle' || clipName === 'death') return;
        const expectedRoot = visual.root;
        setTimeout(() => {
            if (!expectedRoot?.isValid || visual.animation !== animation || !animation.isValid) return;
            animation.crossFade('idle', 0.12);
        }, Math.max(100, Number(clip.duration || 0.6) * 1000));
    }

    private playProceduralAnimation(
        visual: UnitVisual | undefined,
        clipName: string,
        returnToIdle = true,
    ) {
        if (!visual?.modelRoot?.isValid) return;
        const node = visual.modelRoot;
        const finish = (milliseconds: number) => {
            if (!returnToIdle || clipName === 'death' || clipName === 'victory') return;
            setTimeout(() => {
                if (!node?.isValid) return;
                tween(node)
                    .to(0.12, { position: Vec3.ZERO, scale: Vec3.ONE })
                    .start();
            }, milliseconds);
        };

        const isFox = visual.speciesCode === 'PET001';
        const isTurtle = visual.speciesCode === 'PET002';
        const isDeer = visual.speciesCode === 'PET008';
        const isBoss = visual.speciesCode === 'BOSS001';

        switch (clipName) {
            case 'enter':
                node.setPosition(0, 0.7, 0);
                node.setScale(0.72, 0.72, 0.72);
                tween(node)
                    .to(0.42, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'backOut' })
                    .start();
                finish(480);
                break;
            case 'idle':
                tween(node)
                    .to(isBoss ? 0.72 : 0.45, {
                        position: new Vec3(0, isTurtle ? 0.012 : 0.035, 0),
                        scale: isBoss
                            ? new Vec3(1.008, 0.992, 1.008)
                            : new Vec3(1.015, 0.985, 1.015),
                    }, { easing: 'sineInOut' })
                    .to(isBoss ? 0.72 : 0.45, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'sineInOut' })
                    .start();
                break;
            case 'basic_attack':
                tween(node)
                    .to(isBoss ? 0.24 : 0.12, {
                        position: new Vec3(0, isTurtle ? -0.11 : -0.06, isFox ? 0.18 : 0.1),
                        scale: isTurtle
                            ? new Vec3(1.09, 0.84, 1.09)
                            : new Vec3(0.98, 0.94, 1.05),
                    }, { easing: 'quadIn' })
                    .to(isBoss ? 0.2 : 0.16, {
                        position: new Vec3(0, isBoss ? -0.02 : 0.08, isFox ? -0.23 : -0.16),
                        scale: isBoss
                            ? new Vec3(1.08, 0.92, 1.08)
                            : new Vec3(1.06, 1.04, 0.94),
                    }, { easing: 'quadOut' })
                    .start();
                finish(isBoss ? 520 : 310);
                break;
            case 'active_skill':
                tween(node)
                    .to(isBoss ? 0.34 : 0.2, {
                        position: new Vec3(0, isTurtle ? -0.14 : -0.08, 0),
                        scale: isTurtle
                            ? new Vec3(1.12, 0.78, 1.12)
                            : isDeer
                                ? new Vec3(0.95, 1.06, 0.95)
                                : new Vec3(0.92, 0.92, 0.92),
                    }, { easing: 'quadIn' })
                    .to(isBoss ? 0.28 : 0.22, {
                        position: new Vec3(0, isBoss ? 0.08 : isDeer ? 0.24 : 0.16, 0),
                        scale: isBoss
                            ? new Vec3(1.16, 0.9, 1.16)
                            : isTurtle
                                ? new Vec3(1.2, 0.96, 1.2)
                                : new Vec3(1.13, 1.13, 1.13),
                    }, { easing: 'backOut' })
                    .start();
                finish(isBoss ? 720 : 470);
                break;
            case 'hit':
                tween(node)
                    .to(0.1, { position: new Vec3(0.12, -0.05, 0), scale: new Vec3(1.06, 0.9, 1.03) }, { easing: 'quadOut' })
                    .to(0.16, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'backOut' })
                    .start();
                break;
            case 'death':
                tween(node)
                    .to(0.36, { position: new Vec3(0, -0.3, 0), scale: new Vec3(1.08, 0.42, 1.08) }, { easing: 'quadIn' })
                    .start();
                break;
            case 'victory':
                tween(node)
                    .to(0.18, { position: new Vec3(0, 0.22, 0), scale: new Vec3(1.07, 1.07, 1.07) }, { easing: 'quadOut' })
                    .to(0.22, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'backOut' })
                    .start();
                break;
            default:
                break;
        }
    }

    private buildRockshellTurtle(root: Node) {
        const skin = new Color(215, 164, 92, 255);
        const belly = new Color(244, 216, 161, 255);
        const rock = new Color(119, 105, 82, 255);
        const moss = new Color(112, 143, 74, 255);
        const amber = new Color(255, 184, 68, 255);
        const eyeColor = new Color(95, 56, 24, 255);

        const body = this.createPrimitive(root, 'Body', 'sphere', skin);
        body.setPosition(0, 0.62, 0);
        body.setScale(0.82, 0.5, 0.92);
        const bellyPlate = this.createPrimitive(root, 'BellyPlate', 'sphere', belly);
        bellyPlate.setPosition(0, 0.58, -0.52);
        bellyPlate.setScale(0.53, 0.38, 0.32);
        const shell = this.createPrimitive(root, 'RockShell', 'sphere', rock);
        shell.setPosition(0, 0.92, 0.24);
        shell.setScale(0.91, 0.58, 0.84);

        const rockOffsets = [
            [-0.48, 1.18, 0.08], [0, 1.34, 0.04], [0.48, 1.18, 0.08],
            [-0.62, 0.98, 0.37], [0, 1.08, 0.5], [0.62, 0.98, 0.37],
        ];
        rockOffsets.forEach(([x, y, z], index) => {
            const piece = this.createPrimitive(root, `ShellRock_${index}`, 'sphere', index % 2 ? this.shiftColor(rock, 18) : rock);
            piece.setPosition(x, y, z);
            piece.setScale(0.38, 0.27, 0.34);
        });
        [[-0.42, 1.26, -0.2], [0.43, 1.19, 0.18], [0, 1.49, 0.12]].forEach(([x, y, z], index) => {
            const crystal = this.createPrimitive(root, `AmberCrystal_${index}`, 'cone', amber);
            crystal.setPosition(x, y, z);
            crystal.setScale(0.18, 0.48 - index * 0.05, 0.18);
        });
        const mossBand = this.createPrimitive(root, 'MossBand', 'torus', moss);
        mossBand.setPosition(0, 1.08, 0.15);
        mossBand.setScale(0.7, 0.1, 0.62);

        const head = this.createPrimitive(root, 'Head', 'sphere', skin);
        head.setPosition(0, 0.8, -0.98);
        head.setScale(0.46, 0.42, 0.5);
        [-0.24, 0.24].forEach((x, index) => {
            const eye = this.createPrimitive(root, `Eye_${index}`, 'sphere', eyeColor);
            eye.setPosition(x, 0.9, -1.41);
            eye.setScale(0.09, 0.12, 0.06);
        });
        [[-0.58, -0.45], [0.58, -0.45], [-0.58, 0.5], [0.58, 0.5]].forEach(([x, z], index) => {
            const leg = this.createPrimitive(root, `Leg_${index}`, 'capsule', skin);
            leg.setPosition(x, 0.28, z);
            leg.setScale(0.24, 0.4, 0.27);
        });
        const sprout = this.createPrimitive(root, 'LeafSprout', 'cone', moss);
        sprout.setPosition(-0.18, 1.66, 0.1);
        sprout.setScale(0.13, 0.38, 0.08);
        sprout.setRotationFromEuler(0, 0, -24);
    }

    private buildForestSpiritDeer(root: Node) {
        const fur = new Color(202, 143, 75, 255);
        const cream = new Color(250, 230, 190, 255);
        const darkWood = new Color(112, 71, 38, 255);
        const leaf = new Color(123, 157, 66, 255);
        const flower = new Color(255, 224, 123, 255);
        const eyeColor = new Color(151, 112, 29, 255);

        const body = this.createPrimitive(root, 'Body', 'capsule', fur);
        body.setPosition(0, 0.95, 0.12);
        body.setScale(0.5, 0.82, 0.54);
        body.setRotationFromEuler(90, 0, 0);
        const chest = this.createPrimitive(root, 'CreamChest', 'sphere', cream);
        chest.setPosition(0, 1.11, -0.37);
        chest.setScale(0.42, 0.58, 0.28);
        const head = this.createPrimitive(root, 'Head', 'sphere', fur);
        head.setPosition(0, 1.75, -0.2);
        head.setScale(0.47, 0.51, 0.43);
        const muzzle = this.createPrimitive(root, 'Muzzle', 'sphere', cream);
        muzzle.setPosition(0, 1.65, -0.58);
        muzzle.setScale(0.28, 0.22, 0.22);

        [-0.35, 0.35].forEach((x, index) => {
            const ear = this.createPrimitive(root, `Ear_${index}`, 'cone', fur);
            ear.setPosition(x, 2.08, -0.15);
            ear.setScale(0.22, 0.42, 0.18);
            ear.setRotationFromEuler(0, 0, index ? -24 : 24);
            const eye = this.createPrimitive(root, `Eye_${index}`, 'sphere', eyeColor);
            eye.setPosition(x * 0.67, 1.8, -0.57);
            eye.setScale(0.095, 0.13, 0.06);
        });

        [-0.22, 0.22].forEach((x, side) => {
            const antler = this.createPrimitive(root, `Antler_${side}`, 'capsule', darkWood);
            antler.setPosition(x, 2.39, -0.05);
            antler.setScale(0.09, 0.62, 0.09);
            antler.setRotationFromEuler(0, 0, side ? -16 : 16);
            [-0.2, 0.18].forEach((branchX, branchIndex) => {
                const branch = this.createPrimitive(root, `AntlerBranch_${side}_${branchIndex}`, 'cone', darkWood);
                branch.setPosition(x + (side ? -branchX : branchX), 2.42 + branchIndex * 0.23, -0.03);
                branch.setScale(0.07, 0.32, 0.07);
                branch.setRotationFromEuler(0, 0, side ? -38 : 38);
                const bud = this.createPrimitive(root, `AntlerLeaf_${side}_${branchIndex}`, 'sphere', leaf);
                bud.setPosition(x + (side ? -branchX : branchX) * 1.35, 2.61 + branchIndex * 0.22, -0.02);
                bud.setScale(0.11, 0.18, 0.06);
            });
        });

        [-0.26, 0.26].forEach((x) => {
            const frontLeg = this.createPrimitive(root, `FrontLeg_${x}`, 'capsule', cream);
            frontLeg.setPosition(x, 0.38, -0.3);
            frontLeg.setScale(0.13, 0.62, 0.14);
            const backLeg = this.createPrimitive(root, `BackLeg_${x}`, 'capsule', fur);
            backLeg.setPosition(x, 0.38, 0.42);
            backLeg.setScale(0.15, 0.62, 0.16);
        });
        [-0.2, 0, 0.2].forEach((x, index) => {
            const wreathLeaf = this.createPrimitive(root, `WreathLeaf_${index}`, 'sphere', leaf);
            wreathLeaf.setPosition(x, 1.25 - Math.abs(x) * 0.45, -0.62);
            wreathLeaf.setScale(0.17, 0.1, 0.07);
        });
        const blossom = this.createPrimitive(root, 'WreathFlower', 'sphere', flower);
        blossom.setPosition(0, 1.22, -0.7);
        blossom.setScale(0.12, 0.12, 0.06);
        const tail = this.createPrimitive(root, 'LeafTail', 'cone', leaf);
        tail.setPosition(0, 1.02, 0.75);
        tail.setScale(0.24, 0.46, 0.24);
        tail.setRotationFromEuler(66, 0, 0);
    }

    private buildAncientGuardian(root: Node) {
        const bark = new Color(91, 65, 43, 255);
        const barkLight = new Color(132, 94, 55, 255);
        const moss = new Color(83, 121, 67, 255);
        const leaf = new Color(129, 158, 77, 255);
        const core = new Color(255, 190, 62, 255);
        const eye = new Color(255, 143, 45, 255);

        const trunk = this.createPrimitive(root, 'Trunk', 'capsule', bark);
        trunk.setPosition(0, 1.6, 0);
        trunk.setScale(0.82, 1.38, 0.68);
        const chest = this.createPrimitive(root, 'ChestBark', 'sphere', barkLight);
        chest.setPosition(0, 2.18, -0.18);
        chest.setScale(1.0, 0.76, 0.68);
        const lifeCore = this.createPrimitive(root, 'LifeCore', 'sphere', core);
        lifeCore.setPosition(0, 2.16, -0.82);
        lifeCore.setScale(0.32, 0.32, 0.12);
        const head = this.createPrimitive(root, 'Head', 'sphere', barkLight);
        head.setPosition(0, 3.05, -0.18);
        head.setScale(0.58, 0.63, 0.5);
        [-0.25, 0.25].forEach((x, index) => {
            const bossEye = this.createPrimitive(root, `Eye_${index}`, 'sphere', eye);
            bossEye.setPosition(x, 3.12, -0.63);
            bossEye.setScale(0.09, 0.08, 0.05);
        });

        [-0.92, 0.92].forEach((x, side) => {
            const arm = this.createPrimitive(root, `RootArm_${side}`, 'capsule', bark);
            arm.setPosition(x, 1.65, -0.02);
            arm.setScale(0.3, 1.15, 0.32);
            arm.setRotationFromEuler(0, 0, side ? -18 : 18);
            const hand = this.createPrimitive(root, `RootHand_${side}`, 'sphere', barkLight);
            hand.setPosition(x * 1.2, 0.72, -0.1);
            hand.setScale(0.42, 0.38, 0.44);
            const leg = this.createPrimitive(root, `RootLeg_${side}`, 'capsule', bark);
            leg.setPosition(x * 0.46, 0.58, 0.12);
            leg.setScale(0.34, 0.72, 0.38);
        });

        [-0.54, 0, 0.54].forEach((x, index) => {
            const crown = this.createPrimitive(root, `CrownBranch_${index}`, 'capsule', bark);
            crown.setPosition(x, 3.73 + (index === 1 ? 0.2 : 0), -0.03);
            crown.setScale(0.12, 0.72, 0.12);
            crown.setRotationFromEuler(0, 0, x * -32);
            const crownLeaf = this.createPrimitive(root, `CrownLeaf_${index}`, 'sphere', leaf);
            crownLeaf.setPosition(x * 1.28, 4.31 + (index === 1 ? 0.18 : 0), -0.02);
            crownLeaf.setScale(0.2, 0.28, 0.1);
        });
        const shoulderMoss = this.createPrimitive(root, 'ShoulderMoss', 'torus', moss);
        shoulderMoss.setPosition(0, 2.55, 0.02);
        shoulderMoss.setScale(0.92, 0.12, 0.72);
    }

    private buildFox(root: Node, color: Color) {
        const body = this.createPrimitive(root, 'Body', 'sphere', color);
        body.setPosition(0, 0.72, 0);
        body.setScale(0.62, 0.78, 0.58);

        const head = this.createPrimitive(root, 'Head', 'sphere', color);
        head.setPosition(0, 1.55, -0.05);
        head.setScale(0.55, 0.53, 0.52);

        const accent = this.shiftColor(color, 32);
        [-0.31, 0.31].forEach((x, index) => {
            const ear = this.createPrimitive(root, `Ear_${index}`, 'cone', accent);
            ear.setPosition(x, 2.05, -0.03);
            ear.setScale(0.24, 0.48, 0.24);
        });

        const tail = this.createPrimitive(root, 'Tail', 'capsule', accent);
        tail.setPosition(0.72, 0.88, 0.34);
        tail.setScale(0.34, 0.78, 0.34);
        tail.setRotationFromEuler(0, 0, -48);
    }

    private buildTurtle(root: Node, color: Color) {
        const body = this.createPrimitive(root, 'Body', 'sphere', this.shiftColor(color, 18));
        body.setPosition(0, 0.58, 0);
        body.setScale(0.78, 0.45, 0.88);

        const shell = this.createPrimitive(root, 'Shell', 'sphere', this.shiftColor(color, -40));
        shell.setPosition(0, 0.86, 0.18);
        shell.setScale(0.82, 0.48, 0.78);

        const head = this.createPrimitive(root, 'Head', 'sphere', color);
        head.setPosition(0, 0.72, -0.92);
        head.setScale(0.38, 0.35, 0.42);
    }

    private buildDeer(root: Node, color: Color) {
        const body = this.createPrimitive(root, 'Body', 'capsule', color);
        body.setPosition(0, 0.85, 0.1);
        body.setScale(0.5, 0.82, 0.5);

        const head = this.createPrimitive(root, 'Head', 'sphere', this.shiftColor(color, 18));
        head.setPosition(0, 1.65, -0.06);
        head.setScale(0.46, 0.5, 0.43);

        [-0.28, 0.28].forEach((x, index) => {
            const antler = this.createPrimitive(root, `Antler_${index}`, 'cone', new Color(225, 211, 166, 255));
            antler.setPosition(x, 2.2, -0.02);
            antler.setScale(0.13, 0.62, 0.13);
        });
    }

    private createPrimitive(parent: Node, name: string, kind: string, color: Color) {
        const node = new Node(name);
        node.layer = Layers.BitMask.DEFAULT;
        parent.addChild(node);
        const renderer = node.addComponent(MeshRenderer);
        renderer.mesh = this.getMesh(kind);
        renderer.setMaterial(this.getMaterial(color), 0);
        return node;
    }

    private getMesh(kind: string) {
        const cached = this.meshes.get(kind);
        if (cached) return cached;
        const geometry = kind === 'plane'
            ? primitives.plane({ width: 1, length: 1, widthSegments: 1, lengthSegments: 1 })
            : kind === 'torus'
                ? primitives.torus(0.5, 0.055, {
                    radialSegments: this.quality.torusSegments,
                    tubularSegments: Math.max(5, Math.floor(this.quality.torusSegments * 0.42)),
                })
                : kind === 'capsule'
                    ? primitives.capsule(0.5, 0.5, 1.5, {
                        sides: this.quality.primitiveSegments,
                        heightSegments: Math.max(4, Math.floor(this.quality.primitiveSegments * 0.66)),
                    })
                    : kind === 'cone'
                        ? primitives.cone(0.5, 1, { radialSegments: this.quality.primitiveSegments })
                        : primitives.sphere(0.5, { segments: this.quality.primitiveSegments });
        const mesh = utils.MeshUtils.createMesh(geometry);
        this.meshes.set(kind, mesh);
        return mesh;
    }

    private getMaterial(color: Color) {
        const key = `${color.r}:${color.g}:${color.b}:${color.a}`;
        const cached = this.materials.get(key);
        if (cached) return cached;
        const material = new Material();
        material.initialize({ effectName: 'builtin-unlit' });
        material.setProperty('mainColor', color);
        this.materials.set(key, material);
        return material;
    }

    private shiftColor(source: Color, amount: number) {
        const channel = (value: number) => Math.max(0, Math.min(255, value + amount));
        return new Color(channel(source.r), channel(source.g), channel(source.b), source.a);
    }

    private async attackAndHit(
        actor: UnitVisual | undefined,
        target: UnitVisual | undefined,
        durationMs: number,
        critical: boolean,
    ) {
        if (!actor?.root?.isValid || !target?.root?.isValid) {
            await this.hit(target, durationMs * 0.55, critical);
            return;
        }
        const origin = actor.home.clone();
        const targetPosition = target.root.position;
        const destination = new Vec3(
            origin.x + (targetPosition.x - origin.x) * 0.54,
            origin.y + 0.12,
            origin.z + (targetPosition.z - origin.z) * 0.54,
        );
        await this.tweenNode(actor.root, durationMs * 0.36, { position: destination }, 'quadOut');
        await Promise.all([
            this.hit(target, durationMs * 0.34, critical),
            this.impactBurst(target, durationMs * 0.34, critical),
            critical ? this.cameraPunch(durationMs * 0.34, 0.2) : Promise.resolve(),
        ]);
        await this.tweenNode(actor.root, durationMs * 0.3, { position: origin }, 'quadIn');
    }

    private async hit(target: UnitVisual | undefined, durationMs: number, critical: boolean) {
        if (!target?.root?.isValid) {
            await this.delay(durationMs);
            return;
        }
        const node = target.root;
        const home = target.home.clone();
        const amount = critical ? 0.22 : 0.12;
        await this.tweenNode(node, durationMs * 0.34, {
            position: new Vec3(home.x + amount, home.y, home.z),
            scale: new Vec3(
                target.baseScale * 1.1,
                target.baseScale * 0.88,
                target.baseScale * 1.1,
            ),
        }, 'quadOut');
        await this.tweenNode(node, durationMs * 0.66, {
            position: home,
            scale: new Vec3(target.baseScale, target.baseScale, target.baseScale),
        }, 'backOut');
    }

    private async supportPulse(target: UnitVisual | undefined, durationMs: number, kind: 'heal' | 'shield') {
        if (!target?.root?.isValid || !this.unitRoot?.isValid) {
            await this.delay(durationMs);
            return;
        }
        if (!this.reserveTransientEffect()) {
            await this.pulse(target.root, durationMs, 1.12);
            return;
        }
        const ring = this.createPrimitive(
            this.unitRoot,
            `Effect_${kind}_${Date.now()}`,
            'torus',
            kind === 'heal'
                ? new Color(111, 238, 170, 220)
                : new Color(104, 196, 255, 220),
        );
        ring.setPosition(target.root.position.x, 0.14, target.root.position.z);
        ring.setScale(0.5, 0.06, 0.5);
        try {
            await Promise.all([
                this.tweenNode(ring, durationMs, { scale: new Vec3(1.7, 0.06, 1.7) }, 'quadOut'),
                this.pulse(target.root, durationMs, 1.12),
            ]);
        } finally {
            if (ring.isValid) ring.destroy();
            this.releaseTransientEffect();
        }
    }

    private async ultimate(side: 'left' | 'right', durationMs: number) {
        const targets = [...this.unitVisuals.values()].filter((visual) => visual.side === side && visual.root.active);
        await Promise.all([
            this.cameraPunch(durationMs * 0.45, 0.28),
            ...targets.map((visual) => this.pulse(visual.root, durationMs, 1.17)),
        ]);
    }

    private async bossTelegraph(actor: UnitVisual | undefined, durationMs: number) {
        if (!actor?.root?.isValid || !this.unitRoot?.isValid) {
            await this.delay(durationMs);
            return;
        }
        if (!this.reserveTransientEffect()) {
            await this.pulse(actor.root, durationMs, 1.16);
            return;
        }
        const ring = this.createPrimitive(
            this.unitRoot,
            `BossTelegraph_${Date.now()}`,
            'torus',
            new Color(255, 116, 84, 230),
        );
        ring.setPosition(actor.root.position.x, 0.1, actor.root.position.z);
        ring.setScale(0.6, 0.06, 0.6);
        try {
            await Promise.all([
                this.tweenNode(ring, durationMs, { scale: new Vec3(2.65, 0.06, 2.65) }, 'quadOut'),
                this.pulse(actor.root, durationMs, 1.18),
            ]);
        } finally {
            if (ring.isValid) ring.destroy();
            this.releaseTransientEffect();
        }
    }

    private async bossSkill(actor: UnitVisual | undefined, durationMs: number) {
        const center = actor?.root?.isValid
            ? actor.root.position.clone()
            : new Vec3(0, 0.08, -1.8);
        const shockwaves = this.quality.enableSecondaryVfx
            ? [
                this.shockwave(center, durationMs * 0.78, 3.8),
                this.delay(durationMs * 0.16).then(() => this.shockwave(center, durationMs * 0.68, 5.2)),
            ]
            : [this.shockwave(center, durationMs * 0.78, 4.2)];
        await Promise.all([
            this.pulse(actor?.root, durationMs, 1.24),
            this.cameraPunch(durationMs, 0.35),
            ...shockwaves,
        ]);
    }

    private async impactBurst(
        target: UnitVisual | undefined,
        durationMs: number,
        critical: boolean,
    ) {
        if (!this.quality.enableSecondaryVfx || !target?.root?.isValid || !this.unitRoot?.isValid) return;
        if (!this.reserveTransientEffect()) return;
        const burst = this.createPrimitive(
            this.unitRoot,
            `ImpactBurst_${Date.now()}`,
            'torus',
            critical ? new Color(255, 220, 103, 235) : new Color(255, 151, 104, 220),
        );
        burst.setPosition(target.root.position.x, 0.75, target.root.position.z);
        burst.setRotationFromEuler(90, 0, 0);
        burst.setScale(0.16, 0.16, 0.16);
        try {
            await this.tweenNode(
                burst,
                durationMs,
                { scale: new Vec3(critical ? 1.4 : 0.95, critical ? 1.4 : 0.95, critical ? 1.4 : 0.95) },
                'quadOut',
            );
        } finally {
            if (burst.isValid) burst.destroy();
            this.releaseTransientEffect();
        }
    }

    private async shockwave(center: Vec3, durationMs: number, targetScale: number) {
        if (!this.unitRoot?.isValid || !this.reserveTransientEffect()) return;
        const ring = this.createPrimitive(
            this.unitRoot,
            `BossShockwave_${Date.now()}_${this.activeTransientEffects}`,
            'torus',
            new Color(255, 91, 73, 225),
        );
        ring.setPosition(center.x, 0.09, center.z);
        ring.setScale(0.35, 0.06, 0.35);
        try {
            await this.tweenNode(
                ring,
                durationMs,
                { scale: new Vec3(targetScale, 0.06, targetScale) },
                'quadOut',
            );
        } finally {
            if (ring.isValid) ring.destroy();
            this.releaseTransientEffect();
        }
    }

    private reserveTransientEffect() {
        if (this.activeTransientEffects >= this.quality.maxTransientEffects) {
            this.skippedEffects += 1;
            return false;
        }
        this.activeTransientEffects += 1;
        this.maxConcurrentEffects = Math.max(this.maxConcurrentEffects, this.activeTransientEffects);
        return true;
    }

    private releaseTransientEffect() {
        this.activeTransientEffects = Math.max(0, this.activeTransientEffects - 1);
    }

    private async defeat(target: UnitVisual | undefined, durationMs: number) {
        if (!target?.root?.isValid) {
            await this.delay(durationMs);
            return;
        }
        await this.tweenNode(target.root, durationMs, {
            scale: new Vec3(target.baseScale, 0.08, target.baseScale),
            position: new Vec3(target.home.x, -0.2, target.home.z),
        }, 'quadIn');
        target.root.active = false;
    }

    private async revive(target: UnitVisual | undefined, durationMs: number) {
        if (!target?.root?.isValid) {
            await this.delay(durationMs);
            return;
        }
        target.root.active = true;
        target.root.setPosition(target.home.x, -0.2, target.home.z);
        target.root.setScale(target.baseScale, 0.08, target.baseScale);
        await this.tweenNode(target.root, durationMs, {
            scale: new Vec3(target.baseScale, target.baseScale, target.baseScale),
            position: target.home,
        }, 'backOut');
    }

    private async pulse(node: Node | null | undefined, durationMs: number, scale: number) {
        if (!node?.isValid) {
            await this.delay(durationMs);
            return;
        }
        const original = node.scale.clone();
        await this.tweenNode(node, durationMs * 0.44, {
            scale: new Vec3(original.x * scale, original.y * scale, original.z * scale),
        }, 'quadOut');
        await this.tweenNode(node, durationMs * 0.56, { scale: original }, 'quadIn');
    }

    private async cameraPunch(durationMs: number, amount: number) {
        if (!this.cameraNode?.isValid) {
            await this.delay(durationMs);
            return;
        }
        const scaledAmount = amount * this.quality.cameraShakeScale;
        const home = new Vec3(0, 8.7, 11.8);
        await this.tweenNode(this.cameraNode, durationMs * 0.36, {
            position: new Vec3(
                scaledAmount,
                8.7 - scaledAmount * 0.5,
                11.8 - scaledAmount,
            ),
        }, 'quadOut');
        await this.tweenNode(this.cameraNode, durationMs * 0.64, { position: home }, 'quadIn');
        this.cameraNode.lookAt(new Vec3(0, 0.35, 0));
    }

    private tweenNode(node: Node, durationMs: number, properties: any, easing: string) {
        return new Promise<void>((resolve) => {
            if (!node?.isValid) {
                resolve();
                return;
            }
            tween(node)
                .to(Math.max(0.01, durationMs / 1000), properties, { easing: easing as any })
                .call(() => resolve())
                .start();
        });
    }

    private delay(durationMs: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, durationMs)));
    }
}
