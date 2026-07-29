import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../client/PetVerseClient');
const prefabDirectory = path.join(projectRoot, 'assets/resources/ui/list-items');

const specs = {
    PetListItem: {
        size: [152, 100],
        icon: [-45, 10, 52, 52],
        name: [28, 28, 82, 26, 13, 0],
        value: [28, 1, 82, 22, 12, 0],
        meta: [28, -25, 82, 22, 11, 0],
    },
    InventoryItem: {
        size: [150, 134],
        icon: [0, 27, 56, 56],
        name: [0, -17, 136, 28, 13, 1],
        value: [42, -49, 64, 22, 12, 1],
        meta: [-42, -49, 64, 22, 11, 1],
    },
    ShopItem: {
        size: [250, 154],
        icon: [-86, 21, 68, 68],
        name: [30, 46, 150, 30, 16, 0],
        value: [36, -49, 164, 30, 16, 1],
        meta: [30, 10, 150, 24, 12, 0],
    },
    HatcheryEggItem: {
        size: [154, 132],
        icon: [0, 26, 56, 64],
        name: [0, -18, 136, 26, 13, 1],
        value: [0, -45, 136, 22, 12, 1],
        meta: [0, -64, 136, 20, 10, 1],
    },
    SkillSlotItem: {
        size: [438, 74],
        icon: [-188, 0, 52, 52],
        name: [-70, 17, 204, 26, 15, 0],
        value: [166, 17, 86, 24, 12, 1],
        meta: [-45, -17, 254, 22, 12, 0],
    },
    FriendListItem: {
        size: [286, 232],
        icon: [0, 52, 78, 78],
        name: [0, -10, 250, 30, 17, 1],
        value: [0, -44, 250, 24, 13, 1],
        meta: [0, -74, 250, 24, 12, 1],
    },
    RankingListItem: {
        size: [604, 78],
        icon: [-250, 0, 54, 54],
        name: [-98, 18, 230, 28, 15, 0],
        value: [190, 0, 140, 28, 15, 1],
        meta: [-78, -18, 270, 24, 12, 0],
    },
};

function record(data, reference) {
    return reference && typeof reference.__id__ === 'number' ? data[reference.__id__] : null;
}

function nodeByName(data, name) {
    return data.find((entry) => entry?.__type__ === 'cc.Node' && entry._name === name);
}

function component(data, node, type) {
    return (node?._components || []).map((reference) => record(data, reference)).find((entry) => entry?.__type__ === type) || null;
}

function color(r, g, b, a = 255) {
    return { __type__: 'cc.Color', r, g, b, a };
}

function setNodeRect(data, name, [x, y, width, height]) {
    const node = nodeByName(data, name);
    if (!node) throw new Error(`Missing node "${name}".`);
    node._lpos = { __type__: 'cc.Vec3', x, y, z: 0 };
    const transform = component(data, node, 'cc.UITransform');
    if (!transform) throw new Error(`Missing UITransform on "${name}".`);
    transform._contentSize = { __type__: 'cc.Size', width, height };
    return node;
}

function setLabel(data, name, [x, y, width, height, fontSize, align]) {
    const node = setNodeRect(data, name, [x, y, width, height]);
    const label = component(data, node, 'cc.Label');
    if (!label) throw new Error(`Missing Label on "${name}".`);
    label._fontSize = fontSize;
    label._actualFontSize = fontSize;
    label._lineHeight = Math.max(fontSize + 4, height - 2);
    label._horizontalAlign = align;
    label._verticalAlign = 1;
    label._enableWrapText = false;
    label._overflow = 2;
    label._color = color(111, 75, 52);
}

function restyle(name, spec) {
    const prefabPath = path.join(prefabDirectory, `${name}.prefab`);
    const data = JSON.parse(fs.readFileSync(prefabPath, 'utf8'));
    setNodeRect(data, name, [0, 0, ...spec.size]);
    const buttonNode = setNodeRect(data, 'Button', [0, 0, ...spec.size]);
    const sprite = component(data, buttonNode, 'cc.Sprite');
    if (sprite) sprite._color = color(255, 249, 230);
    const button = component(data, buttonNode, 'cc.Button');
    if (button) {
        button._normalColor = color(255, 249, 230);
        button._hoverColor = color(255, 242, 205);
        button._pressedColor = color(246, 220, 166);
        button._disabledColor = color(225, 217, 201);
        button._duration = 0.08;
    }
    const legacyLabel = nodeByName(data, 'Label');
    if (legacyLabel) legacyLabel._active = false;
    setNodeRect(data, 'Icon', spec.icon);
    setLabel(data, 'NameLabel', spec.name);
    setLabel(data, 'CountLabel', spec.value);
    setLabel(data, 'MetaLabel', spec.meta);
    fs.writeFileSync(prefabPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const requested = process.argv.slice(2);
const selected = requested.length ? requested : Object.keys(specs);
selected.forEach((name) => {
    if (!specs[name]) throw new Error(`Unknown dynamic list Prefab "${name}".`);
    restyle(name, specs[name]);
});

console.log(`Restyled ${selected.length} dynamic list Prefab(s): ${selected.join(', ')}.`);
