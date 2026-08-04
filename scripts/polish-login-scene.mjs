import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scenePath = resolve(
  import.meta.dirname,
  '../client/PetVerseClient/assets/scenes/LoginScene.scene',
);
const scene = JSON.parse(readFileSync(scenePath, 'utf8'));

const ref = (id) => ({ __id__: id });
const vec3 = (x, y, z = 0) => ({ __type__: 'cc.Vec3', x, y, z });
const quat = () => ({ __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 });
const color = (r, g, b, a = 255) => ({ __type__: 'cc.Color', r, g, b, a });
const size = (width, height) => ({ __type__: 'cc.Size', width, height });
const anchor = () => ({ __type__: 'cc.Vec2', x: 0.5, y: 0.5 });
const idFor = (name, suffix) => `${name}${suffix}`.replace(/[^a-z0-9+/]/gi, '').slice(0, 22);

function nodeIndex(name) {
  return scene.findIndex((item) => item?.__type__ === 'cc.Node' && item?._name === name);
}

function addVisualNode({ name, parent, x = 0, y = 0, width, height, scale = 1, spriteFrame = '', label = null }) {
  const existing = nodeIndex(name);
  if (existing >= 0) return existing;
  const index = scene.length;
  const node = {
    __type__: 'cc.Node', _name: name, _objFlags: 0, __editorExtras__: {},
    _parent: ref(parent), _children: [], _active: true, _components: [], _prefab: null,
    _lpos: vec3(x, y), _lrot: quat(), _lscale: vec3(scale, scale, 1),
    _mobility: 0, _layer: 33554432, _euler: vec3(0, 0), _id: idFor(name, 'NodeV12'),
  };
  scene.push(node);
  const transformIndex = scene.length;
  scene.push({
    __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
    node: ref(index), _enabled: true, __prefab: null,
    _contentSize: size(width, height), _anchorPoint: anchor(), _id: idFor(name, 'TransformV12'),
  });
  node._components.push(ref(transformIndex));

  if (spriteFrame) {
    const spriteIndex = scene.length;
    scene.push({
      __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
      node: ref(index), _enabled: true, __prefab: null, _customMaterial: null,
      _srcBlendFactor: 2, _dstBlendFactor: 4, _color: color(255, 255, 255),
      _spriteFrame: { __uuid__: spriteFrame, __expectedType__: 'cc.SpriteFrame' },
      _type: 0, _fillType: 0, _sizeMode: 0,
      _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
      _isTrimmedMode: true, _useGrayscale: false, _atlas: null,
      _id: idFor(name, 'SpriteV12'),
    });
    node._components.push(ref(spriteIndex));
  }

  if (label) {
    const labelIndex = scene.length;
    scene.push({
      __type__: 'cc.Label', _name: '', _objFlags: 0, __editorExtras__: {},
      node: ref(index), _enabled: true, __prefab: null, _customMaterial: null,
      _srcBlendFactor: 2, _dstBlendFactor: 4, _color: color(...label.color),
      _string: label.text, _horizontalAlign: 1, _verticalAlign: 1,
      _actualFontSize: label.fontSize, _fontSize: label.fontSize,
      _fontFamily: 'Arial', _lineHeight: label.lineHeight || label.fontSize + 8,
      _overflow: 1, _enableWrapText: true, _font: null, _isSystemFontUsed: true,
      _spacingX: 0, _isItalic: false, _isBold: Boolean(label.bold),
      _isUnderline: false, _underlineHeight: 2, _cacheMode: 0,
      _enableOutline: Boolean(label.outline), _outlineColor: color(100, 63, 34, 220),
      _outlineWidth: label.outline ? 3 : 0, _enableShadow: false,
      _shadowColor: color(0, 0, 0), _shadowOffset: { __type__: 'cc.Vec2', x: 2, y: 2 },
      _shadowBlur: 2, _id: idFor(name, 'LabelV12'),
    });
    node._components.push(ref(labelIndex));
    node.__labelComponentId = labelIndex;
  }

  scene[parent]._children.push(ref(index));
  return index;
}

const canvas = nodeIndex('Canvas');
const manager = nodeIndex('LoginManager');
const title = nodeIndex('PetVerse');
const loginButton = nodeIndex('进入游戏');
if (canvas < 0 || manager < 0 || title < 0 || loginButton < 0) {
  throw new Error('LoginScene is missing required editor nodes');
}

const background = addVisualNode({
  name: 'LoginBackground', parent: canvas, width: 720, height: 1280,
  spriteFrame: '9b47b5be-5e5c-43c4-9ad6-795c35fcef28@f9941',
});
const pet = addVisualNode({
  name: 'LoginPet', parent: canvas, y: -20, width: 440, height: 440,
  spriteFrame: '0eb639ca-4b9a-44a3-895d-e5f33e28f323@f9941',
});
const subtitle = addVisualNode({
  name: 'LoginSubtitle', parent: canvas, y: 240, width: 520, height: 50,
  label: { text: '养成独一无二的梦幻萌宠', fontSize: 24, color: [112, 74, 45, 255], bold: true },
});
const status = addVisualNode({
  name: 'LoginStatus', parent: canvas, y: -455, width: 520, height: 48,
  label: { text: '点击开始，进入温馨小屋', fontSize: 20, color: [112, 74, 45, 255] },
});

scene[title]._lpos = vec3(0, 340);
const titleTransform = scene[scene[title]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.UITransform').__id__];
titleTransform._contentSize = size(560, 120);
const titleLabel = scene[scene[title]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.Label').__id__];
Object.assign(titleLabel, {
  _string: 'PetVerse', _fontSize: 64, _actualFontSize: 64, _lineHeight: 78,
  _isBold: true, _color: color(255, 246, 215), _enableOutline: true,
  _outlineColor: color(112, 68, 36, 235), _outlineWidth: 4,
});

scene[loginButton]._lpos = vec3(0, -380);
const buttonTransform = scene[scene[loginButton]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.UITransform').__id__];
buttonTransform._contentSize = size(360, 76);
const buttonSprite = scene[scene[loginButton]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.Sprite').__id__];
buttonSprite._color = color(255, 211, 91);
const button = scene[scene[loginButton]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.Button').__id__];
button._normalColor = color(255, 211, 91);
button._hoverColor = color(255, 224, 126);
button._pressedColor = color(230, 177, 55);
button._disabledColor = color(190, 180, 150);
button._zoomScale = 1.04;
const buttonLabelNode = scene[loginButton]._children[0].__id__;
const buttonLabelTransform = scene[scene[buttonLabelNode]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.UITransform').__id__];
buttonLabelTransform._contentSize = size(340, 70);
const buttonLabel = scene[scene[buttonLabelNode]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.Label').__id__];
Object.assign(buttonLabel, {
  _string: '进入温馨小屋', _fontSize: 28, _actualFontSize: 28, _lineHeight: 46,
  _isBold: true, _color: color(99, 62, 35),
});

const managerComponents = scene[manager]._components.map((item) => scene[item.__id__]);
const testLogin = managerComponents.find((item) => String(item?.__type__ || '').startsWith('5197ec'));
if (testLogin) testLogin._enabled = false;
const loginUi = managerComponents.find((item) => String(item?.__type__ || '').startsWith('7b0e65'));
if (!loginUi) throw new Error('LoginUI component is missing');
loginUi.loginButton = ref(scene[loginButton]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.Button').__id__);
loginUi.statusLabel = ref(scene[status]._components.find((item) => scene[item.__id__]?.__type__ === 'cc.Label').__id__);
delete scene[status].__labelComponentId;
delete scene[subtitle].__labelComponentId;

const originalChildren = scene[canvas]._children.map((item) => item.__id__);
const order = [
  originalChildren.find((id) => scene[id]?._name === 'Camera'),
  background, manager, pet, title, subtitle, loginButton, status,
].filter((id, index, list) => Number.isInteger(id) && list.indexOf(id) === index);
scene[canvas]._children = order.map(ref);

writeFileSync(scenePath, `${JSON.stringify(scene, null, 2)}\n`, 'utf8');
console.log('LoginScene V12 polish applied');
