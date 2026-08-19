/*
test-ejercicio3.js — Test unitario para funciones core del TP3
*/

// Utils
function assertArraysEqual(actual, expected, tolerance = 1e-6, message = '') {
  if (actual.length !== expected.length) {
    throw new Error(`${message}: Array lengths differ. Expected ${expected.length}, got ${actual.length}`);
  }
  for (let i = 0; i < actual.length; i++) {
    if (Math.abs(actual[i] - expected[i]) > tolerance) {
      throw new Error(`${message}: Arrays differ at index ${i}. Expected ${expected[i]}, got ${actual[i]}`);
    }
  }
}

function assertEqual(actual, expected, tolerance = 1e-6, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
  }
}

// ======================= Camera Matrix Tests =======================

function testLookAt() {
  console.log('Testing lookAt...');

  // Test 1: Identidad: cámara en el origen mirando hacia el eje Z negativo
  const eye = [0, 0, 0];
  const center = [0, 0, -1];
  const up = [0, 1, 0];
  
  const viewMatrix = lookAt(eye, center, up);

  // Debería ser la identidad para esta configuración (estilo OpenGL)
  const expectedIdentity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  assertArraysEqual(viewMatrix, expectedIdentity, 1e-6, 'lookAt identity case');

  // Test 2: Transformación de traslación
  const viewMatrix2 = lookAt([0,0,5], [0,0,0], [0,1,0]);

  // Debería ser una traslación de -5 en Z
  const expectedTranslation = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-5,1];
  assertArraysEqual(viewMatrix2, expectedTranslation, 1e-6, 'lookAt translation case');

  // Punto en el origen debería transformarse a (0,0,-5) en el espacio de vista
  const origin = mat4Vec4(viewMatrix2, [0,0,0,1]);
  assertArraysEqual(origin, [0,0,-5,1], 1e-6, 'lookAt point transformation');

  // Test 3: Rotación
  const viewMatrix3 = lookAt([5,0,0], [0,0,0], [0,1,0]);

  // Debería transformar la posición de la cámara a (0,0,0)
  const cameraPos = mat4Vec4(viewMatrix3, [5,0,0,1]);
  assertArraysEqual(cameraPos, [0,0,0,1], 1e-6, 'lookAt rotation case');

  // Punto en el origen debería estar en (0,0,-5) en el espacio de vista
  const originRotated = mat4Vec4(viewMatrix3, [0,0,0,1]);
  assertArraysEqual(originRotated, [0,0,-5,1], 1e-6, 'lookAt rotated origin');

  // Test 4: Estructura de R = filas (u, v, w), como en la diapositiva de clase.
  // Para la cámara en (0,0,5) mirando al origen (visión = -Z):
  //   u (derecha)             = [1, 0, 0]
  //   v (arriba)              = [0, 1, 0]
  //   w (opuesto a la visión) = [0, 0, 1]
  assertEqual(viewMatrix2[0], 1, 1e-6, 'lookAt fila u (derecha) X');
  assertEqual(viewMatrix2[4], 0, 1e-6, 'lookAt fila u (derecha) Y');
  assertEqual(viewMatrix2[8], 0, 1e-6, 'lookAt fila u (derecha) Z');
  assertEqual(viewMatrix2[1], 0, 1e-6, 'lookAt fila v (arriba) X');
  assertEqual(viewMatrix2[5], 1, 1e-6, 'lookAt fila v (arriba) Y');
  assertEqual(viewMatrix2[9], 0, 1e-6, 'lookAt fila v (arriba) Z');
  assertEqual(viewMatrix2[2], 0, 1e-6, 'lookAt fila w X');
  assertEqual(viewMatrix2[6], 0, 1e-6, 'lookAt fila w Y');
  assertEqual(viewMatrix2[10], 1, 1e-6, 'lookAt fila w Z');
  assertEqual(viewMatrix2[15], 1, 1e-6, 'lookAt coordenada homogénea');

  // Test 5: Las filas u, v, w forman una base ortonormal derecha.
  const u = [viewMatrix2[0], viewMatrix2[4], viewMatrix2[8]];
  const v = [viewMatrix2[1], viewMatrix2[5], viewMatrix2[9]];
  const w = [viewMatrix2[2], viewMatrix2[6], viewMatrix2[10]];

  assertEqual(Vec.norm(u), 1, 1e-6, 'lookAt |u| = 1');
  assertEqual(Vec.norm(v), 1, 1e-6, 'lookAt |v| = 1');
  assertEqual(Vec.norm(w), 1, 1e-6, 'lookAt |w| = 1');
  assertEqual(Vec.dot(u, v), 0, 1e-6, 'lookAt u ⊥ v');
  assertEqual(Vec.dot(u, w), 0, 1e-6, 'lookAt u ⊥ w');
  assertEqual(Vec.dot(v, w), 0, 1e-6, 'lookAt v ⊥ w');

  // Test 6: Estructura V = R · T (diapositiva de clase).
  // Para una cámara arbitraria, la columna de traslación es -(R · eye)
  // y el ojo se transforma al origen.
  const e = [2, 3, 5];
  const Vt = lookAt(e, [0, 0, 0], [0, 1, 0]);
  const ru = [Vt[0], Vt[4], Vt[8]];
  const rv = [Vt[1], Vt[5], Vt[9]];
  const rw = [Vt[2], Vt[6], Vt[10]];
  const Re = [Vec.dot(ru, e), Vec.dot(rv, e), Vec.dot(rw, e)]; // R · eye
  assertArraysEqual([Vt[12], Vt[13], Vt[14]], [-Re[0], -Re[1], -Re[2]], 1e-6,
    'lookAt V = R·T: traslación = -(R·eye)');
  assertArraysEqual(mat4Vec4(Vt, [e[0], e[1], e[2], 1]), [0, 0, 0, 1], 1e-6,
    'lookAt lleva eye al origen');

  console.log('✓ lookAt tests passed');
}

// ======================= Test: Perspectiva y Ortográfica =======================

function testProjective() {
  console.log('Testing projective...');

  // Matriz proyectiva con n=-1, f=-10 (column-major)
  //  | -1   0    0    0 |
  //  |  0  -1    0    0 |
  //  |  0   0  -11  -10 |
  //  |  0   0    1    0 |
  const P = projective(-1, -10);
  const expected = [ -1, 0, 0, 0,
                      0, -1, 0, 0,
                      0, 0, -11, 1,
                      0, 0, -10, 0 ];
  assertArraysEqual(P, expected, 1e-6, 'projective matrix values');

  // La fila inferior [0 0 1 0] hace que w' = z
  const q = mat4Vec4(P, [2, 3, -5, 1]);
  assertEqual(q[3], -5, 1e-6, 'projective w = z');

  console.log('✓ projective tests passed');
}

function testPerspective() {
  console.log('Testing perspective...');

  // Frustum simétrico: l=-1, r=1, b=-1, t=1, n=-1, f=-10
  const l = -1, r = 1, b = -1, t = 1, near = -1, far = -10;
  const P = perspective(l, r, b, t, near, far);

  // perspective debe ser la composición orthographic · projective
  const expectedComposition = mat4Mul(orthographic(l, r, b, t, near, far), projective(near, far));
  assertArraysEqual(P, expectedComposition, 1e-6, 'perspective = orthographic · projective');

  // Valor esperado explícito (column-major)
  const expectedMatrix = [ -1, 0, 0, 0,
                            0, -1, 0, 0,
                            0, 0, -11/9, 1,
                            0, 0, -20/9, 0 ];
  assertArraysEqual(P, expectedMatrix, 1e-6, 'perspective matrix values');

  // Plano near mapea a z_ndc = +1
  const nearPoint = mat4Vec4(P, [0, 0, near, 1]);
  assertEqual(nearPoint[2] / nearPoint[3], 1, 1e-6, 'perspective near plane -> z_ndc = 1');

  // Plano far mapea a z_ndc = -1
  const farPoint = mat4Vec4(P, [0, 0, far, 1]);
  assertEqual(farPoint[2] / farPoint[3], -1, 1e-6, 'perspective far plane -> z_ndc = -1');

  // Esquina de la ventana en el near -> NDC (1, 1)
  const corner = mat4Vec4(P, [r, t, near, 1]);
  assertEqual(corner[0] / corner[3], 1, 1e-6, 'perspective frustum corner X');
  assertEqual(corner[1] / corner[3], 1, 1e-6, 'perspective frustum corner Y');

  // La mitad-ancho de la ventana escala x: con r=2 el término [0] cambia
  const wide = perspective(-2, 2, -1, 1, near, far);
  assertEqual(wide[0], near / 2, 1e-6, 'perspective window width scaling');

  console.log('✓ perspective tests passed');
}

function testOrthographic() {
  console.log('Testing orthographic...');

  // Test 1: Proyección ortográfica estándar con valores negativos para near/far
  const left = -2, right = 2, bottom = -2, top = 2;
  const near = -1, far = -10;  // Valores negativos según la nueva convención
  
  const orthoMatrix = orthographic(left, right, bottom, top, near, far);

  // Valores esperados con near=-1, far=-10
  // w = right - left = 4
  // h = top - bottom = 4  
  // d = near - far = -1 - (-10) = 9
  // [2/4,  0,    0,    0,
  //  0,    2/4,  0,    0,
  //  0,    0,   2/9,   0,
  //  0,    0,   11/9,  1]
  
  const expectedMatrix = [
    0.5, 0, 0, 0,
    0, 0.5, 0, 0,
    0, 0, 2/9, 0,
    0, 0, 11/9, 1
  ];
  
  assertArraysEqual(orthoMatrix, expectedMatrix, 1e-10, 'orthographic matrix values');

  // Test 2: Frustum asimétrico con valores negativos
  const orthoMatrix2 = orthographic(-1, 3, -2, 1, -0.1, -50);  // near/far negativos
  const width = 4, height = 3, depth = -0.1 - (-50); // depth = 49.9
  assertEqual(orthoMatrix2[0], 2/width, 1e-6, 'orthographic width scaling');
  assertEqual(orthoMatrix2[5], 2/height, 1e-6, 'orthographic height scaling');
  assertEqual(orthoMatrix2[10], 2/depth, 1e-6, 'orthographic depth scaling'); // positivo ahora
  assertEqual(orthoMatrix2[12], -0.5, 1e-6, 'orthographic X translation'); // -(right+left)/w = -(3+(-1))/4 = -0.5
  assertEqual(orthoMatrix2[13], 1/3, 1e-6, 'orthographic Y translation');

  
  // Test 4: punto central
  const centerZ = (near + far) / 2; // (-1 + -10)/2 = -5.5
  const center = mat4Vec4(orthoMatrix, [0, 0, centerZ, 1]);
  assertArraysEqual([center[0], center[1], center[2]], [0, 0, 0], 1e-6, 'orthographic center mapping');

  // Test 5: Estructura de la matriz
  assertEqual(orthoMatrix[1], 0, 1e-6, 'orthographic [0,1] should be 0');
  assertEqual(orthoMatrix[2], 0, 1e-6, 'orthographic [0,2] should be 0');
  assertEqual(orthoMatrix[4], 0, 1e-6, 'orthographic [1,0] should be 0');
  assertEqual(orthoMatrix[6], 0, 1e-6, 'orthographic [1,2] should be 0');
  assertEqual(orthoMatrix[8], 0, 1e-6, 'orthographic [2,0] should be 0');
  assertEqual(orthoMatrix[9], 0, 1e-6, 'orthographic [2,1] should be 0');
  assertEqual(orthoMatrix[11], 0, 1e-6, 'orthographic [2,3] should be 0');
  assertEqual(orthoMatrix[15], 1, 1e-6, 'orthographic [3,3] should be 1');
  
  console.log('✓ orthographic tests passed');
}


// ======================= Tests: funciones de configuración =======================

function testSetupCamera() {
  console.log('Testing setupCamera...');
  
  // Test 1: cámara estándar
  const ui1 = {
    az: 0,        // 0 degrees azimuth
    el: 0,        // 0 degrees elevation
  };
  
  const result1 = setupCamera(ui1);
  
  // con azimut=0, elevación=0: la cámara debería estar en (3, 0, 0)
  // NOTAR usamos radio=3.
  const expectedEye1 = [3, 0, 0];
  const expectedCenter1 = [0, 0, 0];
  const expectedUp1 = [0, 1, 0];
  
  assertArraysEqual(result1.eye, expectedEye1, 1e-6, 'setupCamera azimuth=0, elevation=0');
  assertArraysEqual(result1.center, expectedCenter1, 1e-6, 'setupCamera center at origin');
  assertArraysEqual(result1.up, expectedUp1, 1e-6, 'setupCamera up vector');

  // Test 2: rotación de 90 grados en azimuth
  const ui2 = {
    az: Math.PI/2,  // 90 degrees azimuth
    el: 0,          // 0 degrees elevation
  };
  
  const result2 = setupCamera(ui2);

  // Con azimut=90°, elevación=0: la cámara debería estar en (0, 0, 3)
  const expectedEye2 = [0, 0, 3];
  assertArraysEqual(result2.eye, expectedEye2, 1e-6, 'setupCamera azimuth=90°, elevation=0');

  // Test 3: rotación de 90 grados en elevación
  const ui3 = {
    az: 0,          // 0 degrees azimuth  
    el: Math.PI/2,  // 90 degrees elevation
  };
  
  const result3 = setupCamera(ui3);

  // Con azimut=0, elevación=90°: la cámara debería estar en (0, 3, 0)
  const expectedEye3 = [0, 3, 0];
  assertArraysEqual(result3.eye, expectedEye3, 1e-6, 'setupCamera azimuth=0, elevation=90°');

  // Test 4: Distancia desde el origen
  const distance1 = Vec.norm(result1.eye);
  const distance2 = Vec.norm(result2.eye);
  const distance3 = Vec.norm(result3.eye);
  
  assertEqual(distance1, 3.0, 1e-6, 'setupCamera distance from origin 1');
  assertEqual(distance2, 3.0, 1e-6, 'setupCamera distance from origin 2');
  assertEqual(distance3, 3.0, 1e-6, 'setupCamera distance from origin 3');

  // Test 5: rotación combinada
  const ui4 = {
    az: Math.PI/4,   // 45 degrees azimuth
    el: Math.PI/6,   // 30 degrees elevation
  };
  
  const result4 = setupCamera(ui4);

  // Verificar distancia
  const distance4 = Vec.norm(result4.eye);
  assertEqual(distance4, 3.0, 1e-6, 'setupCamera distance with combined rotation');

  // Verificar componente Y
  const expectedY = 3.0 * Math.sin(Math.PI/6);
  assertEqual(result4.eye[1], expectedY, 1e-6, 'setupCamera elevation calculation');
  
  console.log('✓ setupCamera tests passed');
}


// ======================= Test: viewport (NDC -> pantalla) =======================

function testNdcToScreen() {
  console.log('Testing ndcToScreen...');

  const W = 800, H = 600;

  // Centro de NDC -> centro de pantalla
  assertArraysEqual(ndcToScreen([0, 0, 0], W, H), [399.5, 299.5, 0], 1e-6, 'ndcToScreen center');

  // Esquina (-1, 1) -> arriba-izquierda (Y invertido)
  assertArraysEqual(ndcToScreen([-1, 1, 0], W, H), [-0.5, -0.5, 0], 1e-6, 'ndcToScreen top-left');

  // Esquina (1, -1) -> abajo-derecha, z se conserva
  assertArraysEqual(ndcToScreen([1, -1, 0.5], W, H), [799.5, 599.5, 0.5], 1e-6, 'ndcToScreen bottom-right keeps z');

  console.log('✓ ndcToScreen tests passed');
}


// ======================= Test de integración =======================

function testIntegration() {
  console.log('Testing integration (MVP pipeline)...');
  
  // 
  const eye = [0, 0, 5];
  const center = [0, 0, 0];
  const up = [0, 1, 0];
  
  const V = lookAt(eye, center, up);
  // Ventana del near a partir del FOV (misma lógica que el pipeline)
  const near = -1, far = -10;
  const top = Math.abs(near) * Math.tan((60 * Math.PI / 180) / 2);
  const P = perspective(-top, top, -top, top, near, far);
  const M = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; // Identidad
  
  // MVP = P * V * M
  const MV = mat4Mul(V, M);
  const MVP = mat4Mul(P, MV);
  
  // Test: punto en origen
  const worldPoint = [0, 0, 0, 1];
  const clipSpace = mat4Vec4(MVP, worldPoint);
  const ndc = [clipSpace[0]/clipSpace[3], clipSpace[1]/clipSpace[3], clipSpace[2]/clipSpace[3]];
  
  // Punto en origen debería estar visible (Z entre -1 y 1)
  if (ndc[2] < -1 || ndc[2] > 1) {
    throw new Error('Integration test: Point at origin not in NDC range');
  }
  
  // Convertir a espacio de pantalla
  const screen = ndcToScreen(ndc, 800, 600);

  // Debería estar cerca del centro de la pantalla
  assertEqual(screen[0], 399.5, 1e-6, 'Integration test screen X');
  assertEqual(screen[1], 299.5, 1e-6, 'Integration test screen Y');
  
  console.log('✓ Integration tests passed');
}

// ======================= Test Runner =======================

function runAllTests() {
  console.log('='.repeat(50));
  console.log('Running TP3 Core Function Tests');
  console.log('='.repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;
  let failedTests = [];
  

  const testGroups = [
    {
      name: 'Camera and View Tests',
      condition: () => typeof lookAt !== 'undefined' || typeof setupCamera !== 'undefined',
      tests: [
        { name: 'testSetupCamera', fn: testSetupCamera, condition: () => typeof setupCamera !== 'undefined' },
        { name: 'testLookAt', fn: testLookAt, condition: () => typeof lookAt !== 'undefined' }
      ]
    },
    {
      name: 'Projection Tests',
      condition: () => typeof orthographic !== 'undefined' || typeof projective !== 'undefined' || typeof perspective !== 'undefined',
      tests: [
        { name: 'testOrthographic', fn: testOrthographic, condition: () => typeof orthographic !== 'undefined' },
        { name: 'testProjective', fn: testProjective, condition: () => typeof projective !== 'undefined' },
        { name: 'testPerspective', fn: testPerspective, condition: () => typeof perspective !== 'undefined' },
        { name: 'testNdcToScreen', fn: testNdcToScreen, condition: () => typeof ndcToScreen !== 'undefined' }
      ]
    },
    {
      name: 'Integration Tests',
      condition: () => typeof lookAt !== 'undefined' && typeof perspective !== 'undefined' && typeof ndcToScreen !== 'undefined',
      tests: [
        { name: 'testIntegration', fn: testIntegration }
      ]
    }
  ];
  
  testGroups.forEach(group => {
    if (group.condition()) {
      console.log(`\n📂 ${group.name}`);
      
      group.tests.forEach(test => {
        totalTests++;
        
        if (test.condition && !test.condition()) {
          console.log(`  ${test.name} - SKIPPED (function not implemented)`);
          return;
        }
        
        try {
          test.fn();
          passedTests++;
        } catch (error) {
          failedTests.push({ name: test.name, error: error.message });
          console.error(` ${test.name} - FAILED: ${error.message}`);
        }
      });
    } else {
      console.log(`\n📂 ${group.name} - SKIPPED (required functions not implemented)`);
      totalTests += group.tests.length;
    }
  });
  
  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${failedTests.length}`);
  console.log(`⏭️  Skipped: ${totalTests - passedTests - failedTests.length}`);
  
  if (failedTests.length > 0) {
    console.log('\n🚨 Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
  }
  
  const percentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
  } else if (passedTests > 0) {
    console.log(`\n⚡ ${percentage}% TESTS PASSED - Keep implementing!`);
  } else {
    console.log('\n🔴 NO TESTS PASSED - Start implementing the functions!');
  }
  
  console.log('='.repeat(50));
  
  return passedTests > 0;
}


if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('TP3 Test Suite loaded. Run runAllTests() to execute tests.');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testLookAt, testSetupCamera,
    testOrthographic, testProjective, testPerspective, testNdcToScreen,
    testIntegration
  };
}