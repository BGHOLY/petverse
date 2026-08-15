import { Component, Node, SkeletalAnimation } from 'cc';

import type { BattlePetVisualProfile } from './BattlePetVisualRegistry';

export type BattleAssetValidationReport = {
    speciesCode: string;
    revision: string;
    valid: boolean;
    nodeCount: number;
    rendererCount: number;
    materialCount: number;
    triangleCount: number;
    animationClips: string[];
    errors: string[];
    warnings: string[];
};

export function validateBattleAsset(
    profile: BattlePetVisualProfile,
    root: Node,
    animation: SkeletalAnimation | null,
): BattleAssetValidationReport {
    const nodes = collectNodes(root);
    const components = root.getComponentsInChildren(Component) as any[];
    const renderers = components.filter((component) => component?.mesh);
    const materials = new Set<string>();
    let triangleCount = 0;

    for (const renderer of renderers) {
        const sharedMaterials = Array.isArray(renderer?.sharedMaterials)
            ? renderer.sharedMaterials
            : [];
        for (const material of sharedMaterials) {
            if (material) materials.add(String(material.uuid || material.name || materials.size));
        }
        const primitives = Array.isArray(renderer?.mesh?.struct?.primitives)
            ? renderer.mesh.struct.primitives
            : [];
        for (const primitive of primitives) {
            const indexCount = Number(
                primitive?.indexView?.count ||
                primitive?.indexCount ||
                0,
            );
            const vertexCount = Number(
                primitive?.vertexBundelIndices?.length
                    ? renderer?.mesh?.struct?.vertexBundles?.[primitive.vertexBundelIndices[0]]?.view?.count
                    : 0,
            );
            triangleCount += Math.floor((indexCount || vertexCount) / 3);
        }
    }

    const componentNames = components.map(componentName);
    const prohibited = componentNames.filter((name) =>
        /Camera|Light|UITransform|Canvas|Button|ParticleSystem/i.test(name),
    );
    const animationClips = (animation?.clips || [])
        .map((clip) => String(clip?.name || ''))
        .filter(Boolean);
    const available = new Set(animationClips);
    const missingAnimations = profile.requiredAnimations.filter((clip) => !available.has(clip));
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!animation) errors.push('缺少 SkeletalAnimation');
    if (missingAnimations.length) errors.push(`缺少动画：${missingAnimations.join(', ')}`);
    if (prohibited.length) errors.push(`包含禁止组件：${[...new Set(prohibited)].join(', ')}`);
    if (nodes.length > profile.maxNodes) errors.push(`节点数 ${nodes.length} 超过预算 ${profile.maxNodes}`);
    if (materials.size > profile.maxMaterials) errors.push(`材质数 ${materials.size} 超过预算 ${profile.maxMaterials}`);
    if (triangleCount > profile.maxTriangles) errors.push(`三角面 ${triangleCount} 超过预算 ${profile.maxTriangles}`);
    if (!renderers.length) errors.push('未发现可渲染网格');
    if (!triangleCount) warnings.push('运行时无法读取三角面数量，必须保留导入前审计报告');

    return {
        speciesCode: profile.speciesCode,
        revision: profile.productionRevision,
        valid: errors.length === 0,
        nodeCount: nodes.length,
        rendererCount: renderers.length,
        materialCount: materials.size,
        triangleCount,
        animationClips,
        errors,
        warnings,
    };
}

function collectNodes(root: Node) {
    const nodes: Node[] = [];
    const visit = (node: Node) => {
        nodes.push(node);
        node.children.forEach(visit);
    };
    visit(root);
    return nodes;
}

function componentName(component: any) {
    return String(
        component?.constructor?.name ||
        component?.__classname__ ||
        component?.name ||
        'UnknownComponent',
    );
}
