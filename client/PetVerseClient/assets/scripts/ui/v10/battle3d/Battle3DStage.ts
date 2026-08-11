import {
    Camera,
    Color,
    Layers,
    Material,
    Mesh,
    MeshRenderer,
    Node,
    primitives,
    tween,
    utils,
    Vec3,
} from 'cc';

import {
    BattlePresentationEvent,
    BattleUnitSnapshot,
} from './BattlePresentationTypes';
import type { BattlePresentationAdapter } from './BattlePresentationDirector';

type UnitVisual = {
    root: Node;
    home: Vec3;
    side: 'left' | 'right';
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

    private readonly unitVisuals = new Map<string, UnitVisual>();
    private readonly materials = new Map<string, Material>();
    private readonly meshes = new Map<string, Mesh>();
    private readonly cameraStates: CameraState[] = [];
    private worldRoot: Node | null = null;
    private unitRoot: Node | null = null;
    private cameraNode: Node | null = null;
    private camera: Camera | null = null;
    private teamSignature = '';

    constructor(private readonly ownerLayer: Node) {
        this.available = this.buildWorld();
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
            left.forEach((unit, index) => this.createUnit(unit, 'left', index));
            right.forEach((unit, index) => this.createUnit(unit, 'right', index));
        }

        [...left, ...right].forEach((unit) => {
            const visual = this.unitVisuals.get(String(unit.id));
            if (!visual?.root?.isValid) return;
            const alive = unit.alive !== false && Number(unit.hp || 0) > 0;
            visual.root.active = alive;
            if (alive && visual.root.scale.y < 0.2) {
                visual.root.setScale(0.82, 0.82, 0.82);
                visual.root.setRotationFromEuler(0, visual.side === 'left' ? 180 : 0, 0);
            }
        });
    }

    async play(event: BattlePresentationEvent, speed: number) {
        if (!this.available || !this.worldRoot?.isValid) return;
        const duration = (milliseconds: number) => milliseconds / Math.max(0.5, speed);
        const actor = this.unitVisuals.get(String(event.actorId || ''));
        const target = this.unitVisuals.get(String(event.targetId || ''));

        switch (event.presentationCue) {
            case 'round.start':
                await this.pulse(this.unitRoot, duration(170), 1.018);
                return;
            case 'damage.hit':
                await this.attackAndHit(actor, target, duration(360), Boolean(event.critical));
                return;
            case 'status.tick':
                await this.hit(target, duration(210), false);
                return;
            case 'support.heal':
                await this.supportPulse(target, duration(320), 'heal');
                return;
            case 'support.shield':
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
                await this.bossTelegraph(actor, duration(520));
                return;
            case 'boss.skill':
                await this.bossSkill(actor, duration(720));
                return;
            case 'boss.phase':
                await Promise.all([
                    this.pulse(actor?.root, duration(520), 1.22),
                    this.cameraPunch(duration(520), 0.24),
                ]);
                return;
            case 'unit.death':
                await this.defeat(target, duration(420));
                return;
            case 'unit.revive':
            case 'unit.survive':
                await this.revive(target, duration(420));
                return;
            case 'battle.finish':
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
            visual.root.setScale(0.82, 0.82, 0.82);
            visual.root.setRotationFromEuler(0, visual.side === 'left' ? 180 : 0, 0);
        }
    }

    dispose() {
        for (const state of this.cameraStates) {
            if (!state.camera?.isValid) continue;
            state.camera.priority = state.priority;
            state.camera.clearFlags = state.clearFlags;
        }
        this.cameraStates.length = 0;
        if (this.worldRoot?.isValid) this.worldRoot.destroy();
        this.worldRoot = null;
        this.unitRoot = null;
        this.cameraNode = null;
        this.camera = null;
        this.unitVisuals.clear();
    }

    private buildWorld() {
        const scene = this.ownerLayer.scene;
        if (!scene) return false;

        const existing = scene.getChildByName('Battle3DVerticalSlice');
        if (existing?.isValid) existing.destroy();

        for (const camera of scene.getComponentsInChildren(Camera)) {
            if ((camera.visibility & Layers.BitMask.UI_2D) === 0) continue;
            this.cameraStates.push({
                camera,
                priority: camera.priority,
                clearFlags: camera.clearFlags,
            });
            camera.priority = Math.max(2, camera.priority);
            camera.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
        }

        const root = new Node('Battle3DVerticalSlice');
        root.layer = Layers.BitMask.DEFAULT;
        scene.addChild(root);
        this.worldRoot = root;

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

        this.createEnvironment(root);
        const units = new Node('BattleUnits');
        units.layer = Layers.BitMask.DEFAULT;
        root.addChild(units);
        this.unitRoot = units;
        return true;
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
        root.setScale(0.82, 0.82, 0.82);
        root.setRotationFromEuler(0, side === 'left' ? 180 : 0, 0);

        const palette = side === 'left' ? ALLY_COLORS : ENEMY_COLORS;
        const color = palette[index % palette.length];
        const speciesCode = String(unit.speciesCode || '').toUpperCase();
        if (speciesCode === 'PET002') this.buildTurtle(root, color);
        else if (speciesCode === 'PET008') this.buildDeer(root, color);
        else this.buildFox(root, color);

        if (unit.role === 'boss') root.setScale(1.16, 1.16, 1.16);

        this.unitVisuals.set(String(unit.id), { root, home: home.clone(), side });
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
                ? primitives.torus(0.5, 0.055, { radialSegments: 20, tubularSegments: 8 })
                : kind === 'capsule'
                    ? primitives.capsule(0.5, 0.5, 1.5, { sides: 12, heightSegments: 8 })
                    : kind === 'cone'
                        ? primitives.cone(0.5, 1, { radialSegments: 12 })
                        : primitives.sphere(0.5, { segments: 16 });
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
            scale: new Vec3(0.9, 0.72, 0.9),
        }, 'quadOut');
        await this.tweenNode(node, durationMs * 0.66, {
            position: home,
            scale: new Vec3(0.82, 0.82, 0.82),
        }, 'backOut');
    }

    private async supportPulse(target: UnitVisual | undefined, durationMs: number, kind: 'heal' | 'shield') {
        if (!target?.root?.isValid || !this.unitRoot?.isValid) {
            await this.delay(durationMs);
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
        await Promise.all([
            this.tweenNode(ring, durationMs, { scale: new Vec3(1.7, 0.06, 1.7) }, 'quadOut'),
            this.pulse(target.root, durationMs, 1.12),
        ]);
        if (ring.isValid) ring.destroy();
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
        const ring = this.createPrimitive(
            this.unitRoot,
            `BossTelegraph_${Date.now()}`,
            'torus',
            new Color(255, 116, 84, 230),
        );
        ring.setPosition(actor.root.position.x, 0.1, actor.root.position.z);
        ring.setScale(0.6, 0.06, 0.6);
        await Promise.all([
            this.tweenNode(ring, durationMs, { scale: new Vec3(2.2, 0.06, 2.2) }, 'quadOut'),
            this.pulse(actor.root, durationMs, 1.16),
        ]);
        if (ring.isValid) ring.destroy();
    }

    private async bossSkill(actor: UnitVisual | undefined, durationMs: number) {
        await Promise.all([
            this.pulse(actor?.root, durationMs, 1.24),
            this.cameraPunch(durationMs, 0.35),
        ]);
    }

    private async defeat(target: UnitVisual | undefined, durationMs: number) {
        if (!target?.root?.isValid) {
            await this.delay(durationMs);
            return;
        }
        await this.tweenNode(target.root, durationMs, {
            scale: new Vec3(0.82, 0.08, 0.82),
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
        target.root.setScale(0.82, 0.08, 0.82);
        await this.tweenNode(target.root, durationMs, {
            scale: new Vec3(0.82, 0.82, 0.82),
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
        const home = new Vec3(0, 8.7, 11.8);
        await this.tweenNode(this.cameraNode, durationMs * 0.36, {
            position: new Vec3(amount, 8.7 - amount * 0.5, 11.8 - amount),
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
