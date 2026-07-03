// 모델 에셋 파이프라인: 게임의 절차 가구를 실제 OBJ/MTL 파일로 출력
// 사용: npm run assets:models  →  assets-src/models/<가구id>.obj + .mtl
// Blender에서 열어 리터치하거나, Meshy 등 AI 툴의 베이스 메시로 사용
import * as THREE from 'three';
import { writeFileSync, mkdirSync } from 'node:fs';
import { DEFS } from '../src/data/furniture.js';

const OUT = 'assets-src/models';
mkdirSync(OUT, { recursive: true });

function exportOBJ(group, name) {
  group.updateMatrixWorld(true);
  const v = [], f = [], mtl = [];
  const matIndex = new Map();
  let vOffset = 1;
  let obj = `# Project Shelter procedural furniture: ${name}\nmtllib ${name}.mtl\n`;

  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const pos = geo.attributes.position;
    const color = '#' + (mesh.material.color ? mesh.material.color.getHexString() : '888888');
    if (!matIndex.has(color)) {
      matIndex.set(color, `m${matIndex.size}`);
      const c = new THREE.Color(color);
      mtl.push(`newmtl m${matIndex.size - 1}\nKd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}\n`);
    }
    obj += `usemtl ${matIndex.get(color)}\n`;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      obj += `v ${p.x.toFixed(5)} ${p.y.toFixed(5)} ${p.z.toFixed(5)}\n`;
    }
    for (let i = 0; i < pos.count; i += 3) {
      obj += `f ${vOffset + i} ${vOffset + i + 1} ${vOffset + i + 2}\n`;
    }
    vOffset += pos.count;
  });

  writeFileSync(`${OUT}/${name}.obj`, obj);
  writeFileSync(`${OUT}/${name}.mtl`, mtl.join('\n'));
}

let count = 0;
for (const [id, def] of Object.entries(DEFS)) {
  try {
    const group = def.build(def.colors[0], 0);
    exportOBJ(group, id);
    console.log(`  ${id}.obj (${def.name})`);
    count++;
  } catch (e) {
    console.error(`  ! ${id} 실패:`, e.message);
  }
}
console.log(`${count}개 모델 생성 완료 → ${OUT}`);
