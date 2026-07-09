import { _decorator, Component, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PetIdleMotion')
export class PetIdleMotion extends Component {
    @property
    moveY: number = 12;

    @property
    scalePower: number = 0.03;

    @property
    speed: number = 2;

    private basePosition: Vec3 = new Vec3();
    private baseScale: Vec3 = new Vec3();
    private time: number = 0;

    onLoad() {
        this.basePosition.set(this.node.position);
        this.baseScale.set(this.node.scale);
    }

    update(deltaTime: number) {
        this.time += deltaTime * this.speed;

        const offsetY = Math.sin(this.time) * this.moveY;
        const scaleOffset = Math.sin(this.time) * this.scalePower;

        this.node.setPosition(
            this.basePosition.x,
            this.basePosition.y + offsetY,
            this.basePosition.z
        );

        this.node.setScale(
            this.baseScale.x + scaleOffset,
            this.baseScale.y + scaleOffset,
            this.baseScale.z
        );
    }
}