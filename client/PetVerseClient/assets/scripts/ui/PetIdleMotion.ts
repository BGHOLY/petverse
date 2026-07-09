import { _decorator, Component, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PetIdleMotion')
export class PetIdleMotion extends Component {
    @property
    moveY: number = 10;

    @property
    scalePower: number = 0.02;

    @property
    speed: number = 2;

    private startPosition: Vec3 = new Vec3();
    private startScale: Vec3 = new Vec3();
    private timer: number = 0;

    onLoad() {
        this.startPosition = this.node.position.clone();
        this.startScale = this.node.scale.clone();
    }

    update(deltaTime: number) {
        this.timer += deltaTime * this.speed;

        const wave = Math.sin(this.timer);
        const y = this.startPosition.y + wave * this.moveY;
        const scale = 1 + wave * this.scalePower;

        this.node.setPosition(
            this.startPosition.x,
            y,
            this.startPosition.z
        );

        this.node.setScale(
            this.startScale.x * scale,
            this.startScale.y * scale,
            this.startScale.z
        );
    }
}