
// Viewport de espacio mundo
let worldCanvas, worldCtx;
let worldViewport = { x: 0, y: 0, width: 250, height: 250 };

// Perspectiva local SOLO para dibujar esta vista auxiliar del mundo.
// Es independiente de la perspective() del ejercicio (que los alumnos implementan
// como composición y usa w = z); aquí usamos la forma directa con w = -z, que es
// lo que espera project3D (descarta puntos con w <= 0).
function worldPerspective(fovYdeg, aspect, znear, zfar){
  const s = 1 / Math.tan((fovYdeg * Math.PI / 180) / 2);
  const z0 = (zfar + znear) / (zfar - znear);
  const z1 = (-2 * zfar * znear) / (zfar - znear);
  return [ s/aspect, 0, 0, 0,
           0, s, 0, 0,
           0, 0, z0, -1,
           0, 0, z1, 0 ];
}

function initWorldView() {
  const mainCanvas = document.getElementById('cv');
  if (!mainCanvas) return;
  
  worldCanvas = document.createElement('canvas');
  worldCanvas.style.position = 'fixed';
  worldCanvas.style.border = '2px solid #333';
  worldCanvas.style.backgroundColor = '#f8f8f8';
  worldCanvas.style.zIndex = '10';
  worldCanvas.style.borderRadius = '4px';
  
  worldCanvas.width = worldViewport.width;
  worldCanvas.height = worldViewport.height;
  worldCanvas.style.left = '20px';
  worldCanvas.style.bottom = '20px';
  worldCanvas.style.width = worldViewport.width + 'px';
  worldCanvas.style.height = worldViewport.height + 'px';
  
  worldCtx = worldCanvas.getContext('2d');
  document.body.appendChild(worldCanvas);
  
  if (typeof render === 'function') {
    render();
  }
}


// Proyección 3D en perspectiva para la vista del mundo
function project3D(worldPos, worldViewMatrix, worldProjMatrix) {
  const viewPos = mat4Vec4(worldViewMatrix, [worldPos[0], worldPos[1], worldPos[2], 1]);
  const clipPos = mat4Vec4(worldProjMatrix, viewPos);
  const w = clipPos[3];
  if (w <= 0 || Math.abs(w) < 1e-6) return null; // behind or too close to the eye plane
  const ndc = [clipPos[0]/w, clipPos[1]/w, clipPos[2]/w];
  const x = (ndc[0] * 0.5 + 0.5) * worldViewport.width;
  const y = (1 - (ndc[1] * 0.5 + 0.5)) * worldViewport.height;
  return [x, y, ndc[2]];
}


// Genera puntos de esquina del frustum en el espacio mundo
function getFrustumCorners(eye, center, up, fov, aspect, near, far) {
  const fovRad = fov * Math.PI / 180;
  const halfHeight = Math.tan(fovRad / 2);
  const halfWidth = halfHeight * aspect;
  
  // View matrix inverse to transform from view to world
  const viewDir = Vec.normalize(Vec.sub(center, eye));
  const right = Vec.normalize(Vec.cross(viewDir, up));
  const realUp = Vec.cross(right, viewDir);
  
  const corners = [];
  
  // Para perspectiva, near y far son positivos (distancia desde el ojo)
  const nearDist = Math.abs(near);
  const farDist = Math.abs(far);
  
  // Near plane corners
  const nearCenter = Vec.add(eye, Vec.scale(viewDir, nearDist));
  const nearH = halfHeight * nearDist;
  const nearW = halfWidth * nearDist;
  
  corners.push(
    Vec.add(Vec.add(nearCenter, Vec.scale(right, -nearW)), Vec.scale(realUp, -nearH)), // bottom-left
    Vec.add(Vec.add(nearCenter, Vec.scale(right, nearW)), Vec.scale(realUp, -nearH)),  // bottom-right
    Vec.add(Vec.add(nearCenter, Vec.scale(right, nearW)), Vec.scale(realUp, nearH)),   // top-right
    Vec.add(Vec.add(nearCenter, Vec.scale(right, -nearW)), Vec.scale(realUp, nearH))  // top-left
  );
  
  // Far plane corners
  const farCenter = Vec.add(eye, Vec.scale(viewDir, farDist));
  const farH = halfHeight * farDist;
  const farW = halfWidth * farDist;
  
  corners.push(
    Vec.add(Vec.add(farCenter, Vec.scale(right, -farW)), Vec.scale(realUp, -farH)), // bottom-left
    Vec.add(Vec.add(farCenter, Vec.scale(right, farW)), Vec.scale(realUp, -farH)),  // bottom-right
    Vec.add(Vec.add(farCenter, Vec.scale(right, farW)), Vec.scale(realUp, farH)),   // top-right
    Vec.add(Vec.add(farCenter, Vec.scale(right, -farW)), Vec.scale(realUp, farH))  // top-left
  );
  
  return corners;
}


// Genera puntos de esquina del prisma ortográfico en el espacio mundo
function getOrthographicFrustumCorners(eye, center, up, left, bottom, aspect, near, far) {
  // View matrix components
  const viewDir = Vec.normalize(Vec.sub(center, eye));
  const right = Vec.normalize(Vec.cross(viewDir, up));
  const realUp = Vec.cross(right, viewDir);
  
  const halfWidth = left * aspect; // Use left parameter with aspect ratio
  const halfHeight = bottom;       // Use bottom parameter directly
  
  const corners = [];
  
  // Para ortográfica, near y far son negativos, los convertimos a distancias positivas
  const nearDist = Math.abs(near);
  const farDist = Math.abs(far);
  
  // Near plane corners
  const nearCenter = Vec.add(eye, Vec.scale(viewDir, nearDist));
  corners.push(
    Vec.add(Vec.add(nearCenter, Vec.scale(right, -halfWidth)), Vec.scale(realUp, -halfHeight)), // bottom-left
    Vec.add(Vec.add(nearCenter, Vec.scale(right, halfWidth)), Vec.scale(realUp, -halfHeight)),  // bottom-right
    Vec.add(Vec.add(nearCenter, Vec.scale(right, halfWidth)), Vec.scale(realUp, halfHeight)),   // top-right
    Vec.add(Vec.add(nearCenter, Vec.scale(right, -halfWidth)), Vec.scale(realUp, halfHeight))  // top-left
  );
  
  // Far plane corners (same size as near plane for orthographic)
  const farCenter = Vec.add(eye, Vec.scale(viewDir, farDist));
  corners.push(
    Vec.add(Vec.add(farCenter, Vec.scale(right, -halfWidth)), Vec.scale(realUp, -halfHeight)), // bottom-left
    Vec.add(Vec.add(farCenter, Vec.scale(right, halfWidth)), Vec.scale(realUp, -halfHeight)),  // bottom-right
    Vec.add(Vec.add(farCenter, Vec.scale(right, halfWidth)), Vec.scale(realUp, halfHeight)),   // top-right
    Vec.add(Vec.add(farCenter, Vec.scale(right, -halfWidth)), Vec.scale(realUp, halfHeight))  // top-left
  );
  
  return corners;
}

function drawWorldView(eye, center, up, fov, aspect, near, far, azimuth, elevation, projectionType) {
  if (!worldCtx) return;
  
  worldCtx.clearRect(0, 0, worldViewport.width, worldViewport.height);
  
  // World view camera positioned for side view
  const worldEye = [12, 0.5, 0];  // Side view from positive X axis, much further and lower
  const worldCenter = [0, 0.5, 0];  // Look slightly up to center the view
  const worldUp = [0, 1, 0];
  
  // Create world view and projection matrices
  const worldViewMatrix = lookAt(worldEye, worldCenter, worldUp);
  const worldProjMatrix = worldPerspective(30, 1, 0.1, 40);
  
  // Helper function to draw line between two 3D points
  function drawLine3D(p1, p2, style = '#666', width = 1, dashed = false) {
    const s1 = project3D(p1, worldViewMatrix, worldProjMatrix);
    const s2 = project3D(p2, worldViewMatrix, worldProjMatrix);
    
    if (!s1 || !s2) return; // Behind camera
    
    worldCtx.strokeStyle = style;
    worldCtx.lineWidth = width;
    worldCtx.setLineDash(dashed ? [5, 5] : []);
    worldCtx.beginPath();
    worldCtx.moveTo(s1[0], s1[1]);
    worldCtx.lineTo(s2[0], s2[1]);
    worldCtx.stroke();
    worldCtx.setLineDash([]); // Reset line dash
  }


  // Dibuja la cuadrícula para la vista lateral (planos YZ y XY)
  worldCtx.strokeStyle = '#ddd';
  worldCtx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    // YZ plane grid (vertical lines)
    drawLine3D([0, i, -3], [0, i, 3], '#eee', 1);
    drawLine3D([0, -3, i], [0, 3, i], '#eee', 1);
    // XZ plane grid (ground plane)
    drawLine3D([i, 0, -3], [i, 0, 3], '#ddd', 1);
    drawLine3D([-3, 0, i], [3, 0, i], '#ddd', 1);
  }
  
    // Draw world cube (fixed in space)
  const cubeVerts = [
    [-0.5,-0.5,-0.5],[ 0.5,-0.5,-0.5],[ 0.5, 0.5,-0.5],[-0.5, 0.5,-0.5],
    [-0.5,-0.5, 0.5],[ 0.5,-0.5, 0.5],[ 0.5, 0.5, 0.5],[-0.5, 0.5, 0.5],
  ];
  
  const edges = [
    [0,1],[1,2],[2,3],[3,0], // bottom face
    [4,5],[5,6],[6,7],[7,4], // top face
    [0,4],[1,5],[2,6],[3,7]  // vertical edges
  ];
  
  edges.forEach(([i, j]) => {
    drawLine3D(cubeVerts[i], cubeVerts[j], '#333', 2);
  });
  
  // Dibuja la cámara como un cono triangular
  function drawCameraCone(cameraPos, lookDir) {
    const coneHeight = 0.3;
    const coneRadius = 0.15;

    // Calcula el vértice superior del cono y el centro de la base
    const tip = cameraPos;
    const baseCenter = [
      cameraPos[0] + lookDir[0] * coneHeight,
      cameraPos[1] + lookDir[1] * coneHeight,
      cameraPos[2] + lookDir[2] * coneHeight
    ];
    
    const rightVec = Vec.normalize(Vec.cross(lookDir, up));
    const upVec = Vec.normalize(Vec.cross(rightVec, lookDir));
    
    const baseVerts = [
      [baseCenter[0] + rightVec[0] * coneRadius,
       baseCenter[1] + rightVec[1] * coneRadius,
       baseCenter[2] + rightVec[2] * coneRadius],
      [baseCenter[0] - rightVec[0] * coneRadius * 0.5 + upVec[0] * coneRadius * 0.866,
       baseCenter[1] - rightVec[1] * coneRadius * 0.5 + upVec[1] * coneRadius * 0.866,
       baseCenter[2] - rightVec[2] * coneRadius * 0.5 + upVec[2] * coneRadius * 0.866],
      [baseCenter[0] - rightVec[0] * coneRadius * 0.5 - upVec[0] * coneRadius * 0.866,
       baseCenter[1] - rightVec[1] * coneRadius * 0.5 - upVec[1] * coneRadius * 0.866,
       baseCenter[2] - rightVec[2] * coneRadius * 0.5 - upVec[2] * coneRadius * 0.866]
    ];
    
    drawLine3D(tip, baseVerts[0], '#ff4444', 2);
    drawLine3D(tip, baseVerts[1], '#ff4444', 2);
    drawLine3D(tip, baseVerts[2], '#ff4444', 2);
    drawLine3D(baseVerts[0], baseVerts[1], '#ff4444', 1);
    drawLine3D(baseVerts[1], baseVerts[2], '#ff4444', 1);
    drawLine3D(baseVerts[2], baseVerts[0], '#ff4444', 1);
  }
  
  const lookDirection = Vec.normalize(Vec.sub(center, eye));
  drawCameraCone(eye, lookDirection);
  

  let frustumCorners;
  
  if (projectionType === 'perspective') {
    frustumCorners = getFrustumCorners(eye, center, up, fov, aspect, near, far);
  } else {
    const orthoLeft = document.getElementById('orthoLeft') ? +document.getElementById('orthoLeft').value : 2.0;
    const orthoBottom = document.getElementById('orthoBottom') ? +document.getElementById('orthoBottom').value : 2.0;
    frustumCorners = getOrthographicFrustumCorners(eye, center, up, orthoLeft, orthoBottom, aspect, near, far);
  }
  
  // Simplified approach: determine visibility from world camera position
  function shouldBeDashed(p1, p2) {
    const midX = (p1[0] + p2[0]) / 2;
    return midX < 1.0; // Edges closer to origin are behind from world view
  }
  
  const frustumEdges = [
    [0,1],[1,2],[2,3],[3,0], // Near plane
    [4,5],[5,6],[6,7],[7,4], // Far plane
    [0,4],[1,5],[2,6],[3,7]  // Connecting edges
  ];
  
  frustumEdges.forEach(([i, j]) => {
    const p1 = frustumCorners[i];
    const p2 = frustumCorners[j];
    const isDashed = shouldBeDashed(p1, p2);
    
    drawLine3D(p1, p2, '#0066ff', 1, isDashed);
  });
  
  
  worldCtx.fillStyle = '#333';
  worldCtx.font = '12px monospace';
  worldCtx.fillText('3D World View', 5, 15);
  worldCtx.fillText(`Projection: ${projectionType}`, 5, 30);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initWorldView, 100); 
});