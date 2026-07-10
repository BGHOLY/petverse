'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = String(process.env.PETVERSE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const results = [];

function log(message = '') {
  process.stdout.write(`${message}\n`);
}

function pass(name, details) {
  results.push({ ok: true, name, details });
  log(`✅ ${name}${details ? `：${details}` : ''}`);
}

function fail(name, details) {
  results.push({ ok: false, name, details });
  log(`❌ ${name}${details ? `：${details}` : ''}`);
}

function assertCheck(condition, name, details) {
  if (condition) {
    pass(name, details);
  } else {
    fail(name, details);
  }
  return Boolean(condition);
}

async function request(path, options = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  const bodyText = options.body ? JSON.stringify(options.body) : null;
  const headers = {
    Accept: 'application/json',
    ...(bodyText ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyText) } : {}),
    ...(options.headers || {}),
  };
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          text += chunk;
        });
        response.on('end', () => {
          let data = null;
          if (text) {
            try {
              data = JSON.parse(text);
            } catch {
              data = { raw: text };
            }
          }

          const status = Number(response.statusCode || 0);
          resolve({
            ok: status >= 200 && status < 300,
            status,
            data,
            url: url.toString(),
          });
        });
      },
    );

    req.setTimeout(15000, () => {
      req.destroy(new Error('请求超时'));
    });
    req.on('error', (error) => {
      reject(new Error(`无法连接后端 ${url.toString()}：${error.message}`));
    });

    if (bodyText) {
      req.write(bodyText);
    }
    req.end();
  });
}

async function post(path, body) {
  return request(path, { method: 'POST', body });
}

function getPayload(response) {
  return response && response.data ? response.data : null;
}

function getPetFromCreate(response) {
  const payload = getPayload(response);
  return payload && (payload.pet || payload.data?.pet || payload.data);
}

function getEggFromLay(response) {
  const payload = getPayload(response);
  return payload && (payload.egg || payload.data?.egg);
}

function getMarriageFromCreate(response) {
  const payload = getPayload(response);
  return payload && (payload.marriage || payload.data?.marriage);
}

function skillCodes(skills) {
  return new Set(
    (Array.isArray(skills) ? skills : [])
      .map((skill) => String(skill?.skillCode || ''))
      .filter(Boolean),
  );
}

function traitIsInheritedOrDeclaredMutation(egg, parentA, parentB, trait) {
  const childValue = egg?.[trait];
  const parentValues = [parentA?.[trait], parentB?.[trait]].filter(Boolean);
  const mutatedTraits = Array.isArray(egg?.mutationData?.mutatedTraits)
    ? egg.mutationData.mutatedTraits
    : [];
  return parentValues.includes(childValue) || mutatedTraits.includes(trait);
}

function geneInheritanceIsValid(egg, parentA, parentB) {
  const child = String(egg?.geneCode || '');
  const father = String(parentA?.geneCode || 'AAAA');
  const mother = String(parentB?.geneCode || 'AAAA');
  const mutationLoci = new Set(
    Array.isArray(egg?.mutationData?.geneMutationLoci)
      ? egg.mutationData.geneMutationLoci.map(Number)
      : [],
  );

  if (!/^[CBAS]{4}$/.test(child)) {
    return false;
  }

  for (let index = 0; index < child.length; index += 1) {
    if (child[index] !== father[index] && child[index] !== mother[index] && !mutationLoci.has(index)) {
      return false;
    }
  }

  return true;
}

async function main() {
  log('============================================================');
  log('PetVerse 婚姻 → 产蛋 → 倒计时 → 孵化 → 继承 全流程测试');
  log(`后端地址：${BASE_URL}`);
  log('============================================================');
  log();

  const health = await request('');
  if (!assertCheck(health.ok, '后端连接', `HTTP ${health.status}`)) {
    throw new Error('后端没有正常运行，请先执行 npm run start:dev。');
  }

  const seed = await post('/dev/seed-all', {});
  assertCheck(seed.ok && getPayload(seed)?.success !== false, '基础数据初始化', `HTTP ${seed.status}`);

  const tag = Date.now().toString().slice(-8);
  const parentAInput = {
    nickname: `Flow-A-${tag}`,
    species: 'Cat',
    rarity: 2,
    quality: 92,
    bodyType: 'small',
    color: 'black',
    pattern: 'stripe',
  };
  const parentBInput = {
    nickname: `Flow-B-${tag}`,
    species: 'Dog',
    rarity: 4,
    quality: 108,
    bodyType: 'large',
    color: 'gold',
    pattern: 'spot',
  };

  const parentAResponse = await post('/pet/create', parentAInput);
  const parentA = getPetFromCreate(parentAResponse);
  if (!assertCheck(Boolean(parentA?.id), '创建测试父本', parentA?.id ? `宠物ID ${parentA.id}` : '未返回宠物ID')) {
    throw new Error('无法创建测试父本。');
  }

  const parentBResponse = await post('/pet/create', parentBInput);
  const parentB = getPetFromCreate(parentBResponse);
  if (!assertCheck(Boolean(parentB?.id), '创建测试母本', parentB?.id ? `宠物ID ${parentB.id}` : '未返回宠物ID')) {
    throw new Error('无法创建测试母本。');
  }

  assertCheck(
    parentA.id !== parentB.id && !parentA.married && !parentB.married,
    '父母宠物初始状态',
    `A=${parentA.id}, B=${parentB.id}`,
  );

  const marriageResponse = await post('/marriage/create', {
    petAId: parentA.id,
    petBId: parentB.id,
  });
  const marriagePayload = getPayload(marriageResponse);
  const marriage = getMarriageFromCreate(marriageResponse);
  if (!assertCheck(
    marriagePayload?.success === true && Boolean(marriage?.id),
    '创建婚姻',
    marriage?.id ? `婚姻ID ${marriage.id}` : marriagePayload?.message,
  )) {
    throw new Error(`婚姻创建失败：${marriagePayload?.message || '未知错误'}`);
  }

  const layResponse = await post('/marriage/lay-egg', { marriageId: marriage.id });
  const layPayload = getPayload(layResponse);
  const egg = getEggFromLay(layResponse);
  if (!assertCheck(
    layPayload?.success === true && Boolean(egg?.id),
    '婚姻产蛋',
    egg?.id ? `蛋ID ${egg.id}` : layPayload?.message,
  )) {
    throw new Error(`产蛋失败：${layPayload?.message || '未知错误'}`);
  }

  assertCheck(egg.parentAId === parentA.id && egg.parentBId === parentB.id, '蛋保存父母ID');
  assertCheck(egg.status === 'unhatched', '蛋初始状态', `status=${egg.status}`);
  assertCheck(Number(egg.remainingSeconds) > 0 && egg.canHatch === false, '孵化倒计时启动', `${egg.remainingSeconds}秒`);
  assertCheck(Number(egg.rarityPotential) >= 1 && Number(egg.rarityPotential) <= 6, '后代稀有度范围', String(egg.rarityPotential));
  assertCheck(Number(egg.quality) >= 80 && Number(egg.quality) <= 120, '后代资质范围', String(egg.quality));
  assertCheck(geneInheritanceIsValid(egg, parentA, parentB), '基因逐位继承与突变记录', egg.geneCode);

  for (const trait of ['species', 'bodyType', 'color', 'pattern']) {
    assertCheck(
      traitIsInheritedOrDeclaredMutation(egg, parentA, parentB, trait),
      `${trait} 外观继承`,
      String(egg[trait]),
    );
  }

  assertCheck(
    egg.parentSnapshot?.parentA?.id === parentA.id && egg.parentSnapshot?.parentB?.id === parentB.id,
    '父母快照保存',
  );
  assertCheck(Array.isArray(egg.inheritedSkills), '继承技能快照保存', `${egg.inheritedSkills?.length || 0}个`);

  if (Number(egg.remainingSeconds) > 0) {
    const earlyHatch = await post('/hatchery/hatch', { eggId: egg.id });
    const earlyPayload = getPayload(earlyHatch);
    assertCheck(
      earlyPayload?.success === false && Number(earlyPayload?.remainingSeconds) > 0,
      '未到时间禁止孵化',
      earlyPayload?.message,
    );
  }

  const concurrentHatches = await Promise.all([
    post('/hatchery/hatch', { eggId: egg.id, force: true }),
    post('/hatchery/hatch', { eggId: egg.id, force: true }),
  ]);
  const hatchPayloads = concurrentHatches.map(getPayload);
  const successfulHatches = hatchPayloads.filter((payload) => payload?.success === true);
  const rejectedHatches = hatchPayloads.filter((payload) => payload?.success === false);

  assertCheck(
    successfulHatches.length === 1 && rejectedHatches.length === 1,
    '并发孵化锁',
    `成功 ${successfulHatches.length} 次，拦截 ${rejectedHatches.length} 次`,
  );

  const hatchPayload = successfulHatches[0];
  const child = hatchPayload?.pet || hatchPayload?.data?.pet;
  if (!assertCheck(
    Boolean(child?.id),
    'Beta强制孵化',
    child?.id ? `后代宠物ID ${child.id}` : hatchPayload?.message,
  )) {
    throw new Error(
      `孵化失败：${hatchPayload?.message || '未知错误'}。如果 NODE_ENV=production，请改回开发模式后重试。`,
    );
  }

  assertCheck(child.fatherId === parentA.id && child.motherId === parentB.id, '后代血统ID一致');
  assertCheck(child.rarity === egg.rarityPotential, '稀有度从蛋固定继承', String(child.rarity));
  assertCheck(child.quality === egg.quality, '资质从蛋固定继承', String(child.quality));
  assertCheck(child.species === egg.species, '物种从蛋固定继承', child.species);
  assertCheck(child.geneCode === egg.geneCode, '基因从蛋固定继承', child.geneCode);
  assertCheck(child.bodyType === egg.bodyType, '体型从蛋固定继承', child.bodyType);
  assertCheck(child.color === egg.color, '颜色从蛋固定继承', child.color);
  assertCheck(child.pattern === egg.pattern, '花纹从蛋固定继承', child.pattern);

  const childSkillCodes = skillCodes(child.skills);
  const inheritedSkillCodes = [...skillCodes(egg.inheritedSkills)];
  assertCheck(
    inheritedSkillCodes.every((code) => childSkillCodes.has(code)),
    '蛋内继承技能保留到后代',
    `${inheritedSkillCodes.length}个继承技能`,
  );

  const duplicateResponse = await post('/hatchery/hatch', { eggId: egg.id, force: true });
  const duplicatePayload = getPayload(duplicateResponse);
  assertCheck(
    duplicatePayload?.success === false && /already hatched/i.test(String(duplicatePayload?.message || '')),
    '同一个蛋不能重复孵化',
    duplicatePayload?.message,
  );

  const eggDetailResponse = await request(`/hatchery/eggs/${egg.id}`);
  const eggDetailPayload = getPayload(eggDetailResponse);
  const eggDetail = eggDetailPayload?.data || eggDetailPayload?.egg;
  assertCheck(
    eggDetailPayload?.success === true && eggDetail?.status === 'hatched' && eggDetail?.hatchedPetId === child.id,
    '蛋详情记录孵化结果',
    `hatchedPetId=${eggDetail?.hatchedPetId}`,
  );

  const childDetailResponse = await request(`/pet/${child.id}`);
  const childDetailPayload = getPayload(childDetailResponse);
  const childDetail = childDetailPayload?.data;
  assertCheck(
    childDetailPayload?.success === true &&
      childDetail?.lineage?.fatherId === parentA.id &&
      childDetail?.lineage?.motherId === parentB.id,
    '宠物详情返回血统',
  );

  const marriagesResponse = await request('/marriage');
  const marriagesPayload = getPayload(marriagesResponse);
  const marriages = marriagesPayload?.marriages || marriagesPayload?.data || [];
  const currentMarriage = Array.isArray(marriages)
    ? marriages.find((item) => item.id === marriage.id)
    : null;
  assertCheck(
    Boolean(currentMarriage) && Number(currentMarriage.eggCount) >= 1 && Number(currentMarriage.cooldownRemainingSeconds) > 0,
    '婚姻产蛋次数与冷却记录',
    currentMarriage ? `eggCount=${currentMarriage.eggCount}` : '未找到婚姻记录',
  );

  const profileResponse = await request('/user/profile');
  const profilePayload = getPayload(profileResponse);
  const profilePets = profilePayload?.data?.pets || profilePayload?.pets || [];
  assertCheck(
    profilePayload?.success === true && Array.isArray(profilePets) && profilePets.some((pet) => pet.id === child.id),
    '玩家档案包含新后代',
    `后代ID ${child.id}`,
  );

  log();
  log('============================================================');
  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  log(`测试完成：通过 ${passed} 项，失败 ${failed} 项`);
  log(`本次生成：父母宠物 ${parentA.id}/${parentB.id}，蛋 ${egg.id}，后代 ${child.id}`);
  log('============================================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  log();
  fail('测试中断', error.message);
  log();
  log('请保留此窗口并截图发送。');
  process.exitCode = 1;
});
