import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const scenePath = path.resolve(
    scriptDirectory,
    '../client/PetVerseClient/assets/scenes/MainScene.scene',
);
const records = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

function nodeId(...segments) {
    let current = records.findIndex(
        (entry) => entry?.__type__ === 'cc.Node' && entry._name === segments[0],
    );
    for (const segment of segments.slice(1)) {
        const reference = (records[current]?._children || [])
            .find(({ __id__ }) => records[__id__]?._name === segment);
        if (!reference) return -1;
        current = reference.__id__;
    }
    return current;
}

const topBarId = nodeId('Canvas', 'PetVerseUIRoot', 'TopBar');
if (topBarId < 0) throw new Error('TopBar was not found.');

let titleNodeId = nodeId('Canvas', 'PetVerseUIRoot', 'TopBar', 'PageTitle');
let titleLabelId = -1;
if (titleNodeId < 0) {
    const sourceNodeId = nodeId('Canvas', 'PetVerseUIRoot', 'TopBar', 'Nickname');
    if (sourceNodeId < 0) throw new Error('Nickname label template was not found.');
    const sourceTransformId = records[sourceNodeId]._components[0].__id__;
    const sourceLabelId = records[sourceNodeId]._components[1].__id__;
    titleNodeId = records.length;
    const titleTransformId = titleNodeId + 1;
    titleLabelId = titleNodeId + 2;

    const node = structuredClone(records[sourceNodeId]);
    const transform = structuredClone(records[sourceTransformId]);
    const label = structuredClone(records[sourceLabelId]);
    node._name = 'PageTitle';
    node._parent = { __id__: topBarId };
    node._components = [{ __id__: titleTransformId }, { __id__: titleLabelId }];
    node._lpos = { __type__: 'cc.Vec3', x: 0, y: 4, z: 0 };
    node._id = 'petVersePageTitleNode';
    transform.node = { __id__: titleNodeId };
    transform._contentSize = { __type__: 'cc.Size', width: 190, height: 36 };
    transform._id = 'petVersePageTitleTransform';
    label.node = { __id__: titleNodeId };
    label._string = '温馨小屋';
    label._horizontalAlign = 1;
    label._fontSize = 19;
    label._actualFontSize = 19;
    label._lineHeight = 26;
    label._enableWrapText = false;
    label._color = { __type__: 'cc.Color', r: 111, g: 75, b: 52, a: 255 };
    label._id = 'petVersePageTitleLabel';
    records.push(node, transform, label);
    records[topBarId]._children.push({ __id__: titleNodeId });
} else {
    titleLabelId = (records[titleNodeId]._components || [])
        .map(({ __id__ }) => __id__)
        .find((id) => records[id]?.__type__ === 'cc.Label') ?? -1;
}

if (titleLabelId < 0) throw new Error('PageTitle Label was not found.');
const mainUi = records.find((entry) => entry && Object.hasOwn(entry, 'nicknameLabel'));
if (!mainUi) throw new Error('MainUI scene component was not found.');
mainUi.pageTitleLabel = { __id__: titleLabelId };

fs.writeFileSync(scenePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
console.log('MainScene TopBar PageTitle is present and bound to MainUI.');
