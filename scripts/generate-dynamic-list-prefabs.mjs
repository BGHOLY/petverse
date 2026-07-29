import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../client/PetVerseClient');
const templatePath = path.join(projectRoot, 'assets/prefab/ItemSlot.prefab');
const targetDirectory = path.join(projectRoot, 'assets/resources/ui/list-items');
const componentUuid = 'c8d9b718-5d30-4aeb-bb4d-9ad55d4828c4';
const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const definitions = {
    PetListItem: 'd45b75bf-93e6-4b99-8bc7-d8a7e5608291',
    InventoryItem: '41a7bc53-f6aa-4d45-b2cf-3d192871ff3e',
    ShopItem: '971c0312-8ba1-4d06-8a3b-296728829787',
    HatcheryEggItem: '7c8f29ae-696e-421f-b9be-2f658bd6ced7',
    SkillSlotItem: 'd246601d-4911-40c2-b48b-8903683867da',
    FriendListItem: '1577c83c-2a65-4915-9292-64225b22d2db',
    RankingListItem: 'b3e4a468-63d5-4595-a652-c9f8fe8fc60e',
};

function compressUuid(uuid) {
    const value = uuid.replace(/-/g, '');
    let output = value.slice(0, 5);
    for (let index = 5; index < value.length; index += 3) {
        const group = Number.parseInt(value.slice(index, index + 3), 16);
        output += base64[group >> 6] + base64[group & 63];
    }
    return output;
}

fs.mkdirSync(targetDirectory, { recursive: true });
const directoryMeta = {
    ver: '1.2.0',
    importer: 'directory',
    imported: true,
    uuid: 'abfc163f-7d29-4167-9129-a4b093627fe0',
    files: [],
    subMetas: {},
    userData: {},
};
fs.writeFileSync(`${targetDirectory}.meta`, `${JSON.stringify(directoryMeta, null, 2)}\n`, 'utf8');

const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
const oldComponentType = compressUuid('1425b7bd-065e-4e9c-861a-5de2f1f6fa5a');
const newComponentType = compressUuid(componentUuid);

function cloneRecords(data, recordIds) {
    const mapping = new Map(recordIds.map((oldId, offset) => [oldId, data.length + offset]));
    const clones = recordIds.map((oldId) => structuredClone(data[oldId]));
    const remap = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(remap);
            return;
        }
        if (typeof value.__id__ === 'number' && mapping.has(value.__id__)) {
            value.__id__ = mapping.get(value.__id__);
        }
        Object.values(value).forEach(remap);
    };
    clones.forEach(remap);
    data.push(...clones);
    return mapping;
}

for (const [name, uuid] of Object.entries(definitions)) {
    const data = structuredClone(template);
    data[0]._name = name;
    data[1]._name = name;
    const componentIndex = data.findIndex((entry) => entry?.__type__ === oldComponentType);
    if (componentIndex < 0) throw new Error('ItemSlot template component was not found.');
    const component = data[componentIndex];
    data[componentIndex] = {
        __type__: newComponentType,
        _name: component._name || '',
        _objFlags: component._objFlags || 0,
        __editorExtras__: component.__editorExtras__ || {},
        node: component.node,
        _enabled: true,
        __prefab: component.__prefab,
        iconSprite: null,
        nameLabel: { __id__: 19 },
        valueLabel: { __id__: 25 },
        metaLabel: null,
        actionButton: { __id__: 13 },
        _id: '',
    };

    const iconMap = cloneRecords(data, [2, 9, 10, 11, 12, 15]);
    const iconNodeId = iconMap.get(2);
    const iconTransformId = iconMap.get(9);
    const iconSpriteId = iconMap.get(11);
    const iconNode = data[iconNodeId];
    iconNode._name = 'Icon';
    iconNode._children = [];
    iconNode._components = [{ __id__: iconTransformId }, { __id__: iconSpriteId }];
    iconNode._lpos = { __type__: 'cc.Vec3', x: -48, y: 0, z: 0 };
    data[iconTransformId]._contentSize = { __type__: 'cc.Size', width: 48, height: 48 };

    const metaMap = cloneRecords(data, [16, 17, 18, 19, 20, 21]);
    const metaNodeId = metaMap.get(16);
    const metaLabelId = metaMap.get(19);
    data[metaNodeId]._name = 'MetaLabel';
    data[metaNodeId]._lpos = { __type__: 'cc.Vec3', x: 22, y: -22, z: 0 };
    data[metaLabelId]._string = '说明';
    data[metaLabelId]._fontSize = 12;
    data[metaLabelId]._actualFontSize = 12;

    data[1]._children.push({ __id__: iconNodeId }, { __id__: metaNodeId });
    data[componentIndex].iconSprite = { __id__: iconSpriteId };
    data[componentIndex].metaLabel = { __id__: metaLabelId };

    const prefabPath = path.join(targetDirectory, `${name}.prefab`);
    const meta = {
        ver: '1.1.50',
        importer: 'prefab',
        imported: true,
        uuid,
        files: ['.json'],
        subMetas: {},
        userData: { syncNodeName: name },
    };
    fs.writeFileSync(prefabPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    fs.writeFileSync(`${prefabPath}.meta`, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

console.log(`Generated ${Object.keys(definitions).length} editor-adjustable list item Prefabs.`);
