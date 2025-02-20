// import * as OrbitControls from './OrbitControls.js';
import { GUI } from './lil-gui.module.min.js';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 1000);

const effectController = {
				width: 10,
				height: 10,
				interval: 0.5,
        planeSize: 0.5,
        depth: 1,
        fps: 30,
        freePainting: false,
        squareColor:'ffffff',
        generateMode: ' ',
				pattern1: 0,
				addColor1:'ffffff',
				addColor2:'ffffff',
				addColor3:'ffffff',
				bg:'000000'
			};

// color configuration
var targetColor = new THREE.Color('green');
var originalColor = new THREE.Color('white');
var colorToWhite  = new THREE.Color('white');
var freePainting = false;
var color_reset = false;
var color_drandom = false;
var add_color1 = new THREE.Color('white');
var add_color2 = new THREE.Color('white');
var add_color3 = new THREE.Color('white');
var backgroundColor = new THREE.Color('black');

var generate_switch = 'start generate'
var getImageData = false;

var fps = 30;
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// matrix
var intX = 10;
var intZ = 10;
var interval = 0.5;
var [matrix, matrixValue, matrixColor] = getMatrix(intX, intZ, interval);
var plane_size = 0.5;
// populate planes
var planeDict = populatePlane(matrix, matrixColor, plane_size);
var rotation = 0;

window.addEventListener("mousemove", onMouseMove);
init();

function init(){
  initGUI();

  window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  });

  // relocate camera
  camera.position.x = 0;
  camera.position.y = 10;
  camera.position.z = 0;

  camera.lookAt(new THREE.Vector3(0,0,0));
  var renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  // controls
  var controls = new OrbitControls( camera, renderer.domElement );
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("webgl").appendChild(renderer.domElement);
  //renderer.render(scene, camera);
  update(renderer, scene, camera, intX, intZ, interval, matrix, matrixValue, planeDict, plane_size, rotation);
}

function update(renderer, scene, camera, x, z, inter, pt_matrix, matrix_value, planeDict, size, rotation){
	scene.background = backgroundColor;
	renderer.render(scene,camera);
  raycaster.setFromCamera(mouse, camera);
	// save(renderer);
  btnSVGExportClick();

  var pivot = new THREE.Object3D();
  pivot.position.set(0,0,0);

  // remove previous geometries from scene
  scene.remove(scene.children[scene.children.length-1]);

  // check color
  for(var key in matrixColor) {
		//console.log(key[2]);
		if (generate_switch == 'stop generate') {
			//console.log(matrixColor);
			var key1 = key.split(',')[0];
			var key2 = key.split(',')[1];
			var plane_color = updateColor(matrix_value, intX, intZ, key1, key2);
			if (plane_color != matrixColor[key]) {
        matrixColor[key] = plane_color;
      };
		}else {
			if (planeDict[key] != undefined) {
	      // reset matrix color
				if (color_reset) {
	        var plane_color = new THREE.Color('white');
	      }else if (color_drandom) {
	        var plane_color = randomizeColor();
	      }else{
	        var plane_color = planeDict[key].material.color;
	      };
	      if (plane_color != matrixColor[key]) {
	        matrixColor[key] = plane_color;
	      };
	    };
		};
  };

	// reset parameters
	intX = effectController.width;
	intZ = effectController.height;
	interval = effectController.interval;
	plane_size = effectController.planeSize;
	fps = effectController.fps;

  // modify canvas (matrix)
  if (size != plane_size) {
    size = plane_size;
    planeDict = populatePlane(pt_matrix, matrixColor, size);
  };
  if (x !== intX) {
    x = intX;
    [pt_matrix, matrix_value, matrixColor] = resizeMatrix(pt_matrix, matrix_value, matrixColor, x, z, inter);
    planeDict = populatePlane(pt_matrix, matrixColor, size);
  };
  if (z !== intZ) {
    z = intZ;
    [pt_matrix, matrix_value, matrixColor] = resizeMatrix(pt_matrix, matrix_value, matrixColor, x, z, inter);
    planeDict = populatePlane(pt_matrix, matrixColor, size);
  };
  if (inter !== interval) {
    inter = interval;
    [pt_matrix, matrix_value, matrixColor] = resizeMatrix(pt_matrix, matrix_value, matrixColor, x, z, inter);
    planeDict = populatePlane(pt_matrix, matrixColor, size);
  };

  matrix_value = updateValue(x, z, matrix_value);
  var depth = effectController.depth;
  pt_matrix = updateMatrix(x, z, pt_matrix, matrix_value, depth);
  for(var key in pt_matrix) {
    const pos = pt_matrix[key];
    var plane = planeDict[key];
    var canvas_color = matrixColor[key];
    // reset color
    if (planeDict[key].material.color != canvas_color) {
      if (color_reset) {
        plane.material.color = canvas_color;
      }else if (color_drandom) {
        plane.material.color = canvas_color;
      }else if (generate_switch == 'stop generate') {
        plane.material.color = canvas_color;
      };
    };
    plane = scale(plane, pos[1]);
    plane.position.set(pos[0], pos[1], pos[2]);
    pivot.add(plane);
    //pivot.rotateY(rotation);
  };
  scene.add(pivot);

  if (color_reset) {
    color_reset = false;
  };
  if (color_drandom) {
    color_drandom = false;
  }

  new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(x+x*inter, 5, z+z*inter)).getCenter(pivot.position).multiplyScalar(-0.9);
  //new THREE.Box3().setFromObject(pivot).getCenter(pivot.position).multiplyScalar(-1);
  //pivot.position.set(-2*x/3, 0, -2*z/3);
  //pivot.position.set(-2*x/3.5-Math.sqrt(x*inter/(inter+2))*(inter+1), 0, -2*z/3.5-Math.sqrt(z*inter))*(inter+1);
  rotation += 0.00002;
  setTimeout(function() {
    requestAnimationFrame(function(){
      update(renderer, scene, camera, x, z, inter, pt_matrix, matrix_value, planeDict, size, rotation);
    });
  }, 1000 / fps);
  //requestAnimationFrame(function(){
    //update(renderer, scene, camera, x, z, inter, pt_matrix, matrix_value, planeDict, size, rotation);
  //});
}

function initGUI() {
	const gui = new GUI({width: 200});
  const folder1 = gui.addFolder('Canvas parameters');
	folder1.add(effectController, "width", 5, 100, 1);
	folder1.add(effectController, "height", 5, 100, 1);
	folder1.add(effectController, "interval", 0, 2, 0.1 );
  folder1.add(effectController, "planeSize", 0, 2, 0.1 );
  const folder2 = gui.addFolder('Dynamic parameters');
  folder2.add(effectController, "depth", 1, 20, 0.1);
  folder2.add(effectController, "fps", 1, 30, 1);
  const folder3 = gui.addFolder('Painting parameters');
	folder3.addColor(effectController, 'bg').name('background color').onChange(function(value) {
    backgroundColor.set(value);
  });
  folder3.add(effectController, 'freePainting').onChange(function(value) {
    freePainting = value
  });
  folder3.addColor(effectController, 'squareColor').name('add color').onChange(function(value) {
    if (freePainting) {
      originalColor.set(value);
    };
  });

  const folder4 = folder3.addFolder('Auto-painting parameters');
  folder4.add(effectController, 'generateMode', ['expand']).onChange(function() {
		if (effectController.generateMode == 'expand') {
			if (folder4.children[1] != undefined) {
				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
			};
			folder4.add(effectController, 'pattern1', 0, 7, 1);
			folder4.addColor(effectController, 'addColor1').name('Color1').onChange(function(value) {
				add_color1 = new THREE.Color().set(value);
			});
			folder4.addColor(effectController, 'addColor2').name('Color2').onChange(function(value) {
				add_color2 = new THREE.Color().set(value);
			});
			folder4.addColor(effectController, 'addColor3').name('Color3').onChange(function(value) {
				add_color3 = new THREE.Color().set(value);
			});
		}else if (effectController.generateMode == 'movement') {
			if (folder4.children[1] != undefined) {
				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
			};
		}else {
			if (folder4.children[1] != undefined) {
				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
				folder4.children[1].parent.folders.splice(folder4.children[1].parent.folders.indexOf(folder4.children[1]), 1);

				folder4.children[1].domElement.parentElement.removeChild(folder4.children[1].domElement);
				folder4.children[1].parent.children.splice(folder4.children[1].parent.children.indexOf(folder4.children[1]), 1);
			};
		};
	});
  const start_stop_generate = {
		start_stop: function() {
      generate_switch = generateColor(generate_switch);
      gui.children[4].name(generate_switch);
		}
	};
	const resetAllColor = {
		resetColor: function() {
			color_reset = resetColor(color_reset);
      console.log('reset');
		}
	};
	const randomColor = {
		randomizeColor: function() {
			color_drandom = randomizer(color_drandom);
			console.log('random');
		}
	};
	const saveImage = {
		save: function() {
			getImageData = getImg(getImageData);
		}
	};

	gui.add(randomColor, 'randomizeColor');
  gui.add(start_stop_generate, 'start_stop').name(generate_switch);
	gui.add(resetAllColor, 'resetColor').name('reset color');
	gui.add(saveImage, 'save').name('save image');

  folder1.open();
	folder2.open();
  folder3.open();
  folder4.open();
}

function onMouseMove(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  var intersects = raycaster.intersectObjects(scene.children, true);
  for (var i = 0; i < intersects.length; i++) {
    this.tl = new TimelineMax();

    this.tl.to(intersects[i].object.scale, 1, {x:0.1, y:0.1});
    //intersects[i].object.material.color = new THREE.Color('white');
    if (freePainting) {
      this.tl.to(intersects[i].object.material.color, 0.5, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b});
      this.tl.to(intersects[i].object.material.color, 0.5, {
        r: originalColor.r,
        g: originalColor.g,
        b: originalColor.b});
    };
  };
}

function getBox(x,y,z){
  var geometry = new THREE.BoxGeometry(x,y,z)
  var material = new THREE.MeshBasicMaterial({
    color:0x00ff00,
  });
  var mesh = new THREE.Mesh(geometry, material);
  return mesh
}

function getPlane(size, color){
  var geometry = new THREE.PlaneGeometry(size, size);
  var material = new THREE.MeshBasicMaterial({
    side:THREE.DoubleSide,
    transparent: true,
    opacity: 0.4
  });
  material.color = color;
  var mesh = new THREE.Mesh(geometry, material);
  return mesh
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// matrixes of 3D positions, values, and colors
function getMatrix(x, z, interval){
  var dict = {};
  var dictValue = {};
  var dictColor = {};
  for (var i = 0; i < x; i++) {
    for (var j = 0; j < z; j++) {
      const pos = [i, j];
      const pt = [i+i*interval, 0, j+j*interval];
      dict[pos] = pt;
      dictColor[pos] = new THREE.Color('white');
      var randomNum = getRandomInt(2);
      if (randomNum == 0) {
        dictValue[pos] = 0;
      } else {
        dictValue[pos] = 1;
      }
    }
  }
  return [dict, dictValue, dictColor];
}

function resizeMatrix(matrix, value, color, x, z, interval){
  var dict = {};
  var dictValue = {};
  var dictColor = {};

  for (var i = 0; i < x; i++) {
    for (var j = 0; j < z; j++) {
      const pos = [i, j];
      if (matrix[pos] == undefined) {
        const pt = [i+i*interval, matrix[pos], j+j*interval];
        dict[pos] = pt;
        var randomNum = getRandomInt(2);
        if (randomNum == 0) {
          dictValue[pos] = 0;
        } else {
          dictValue[pos] = 1;
        };
        dictColor[pos] = new THREE.Color('white');
      }else {
        const pt = [i+i*interval, 0, j+j*interval];
        dict[pos] = pt;
        dictValue[pos] = value[pos];
        dictColor[pos] = color[pos];
				if (dictColor[pos] == undefined) {
					dictColor[pos] = new THREE.Color('white');
				};
      };
    };
  };
  return [dict, dictValue, dictColor];
}

function populatePlane(matrix, colorVlaue, size){
  var dict = {};
  for(var key in matrix) {
    var position = matrix[key];
    var color = colorVlaue[key];
    var plane = getPlane(size, color);
    plane.position.set(position[0], position[1], position[2]);
    plane.rotation.x = Math.PI/2;
    dict[key] = plane;
  }
  return dict
}

function getNeighbors(i, j, x, z){
  //collect all neighbors in a list
  var i_right = i+1;
  var i_left = i-1;
  var j_up = j+1;
  var j_down = j-1;

  //if i or j is at an edge then take oposite neighbors that existed
  if (i == 0) {
    i_left = i_right;
  };
  if (i == x-1) {
    i_right = i_left;
  };
  if (j == 0) {
    j_down = j_up;
  };
  if (j == z-1) {
    j_up == j_down;
  };
  var neighbors = [[i_right, j_up], [i_right, j_down], [i, j_up], [i, j_down],
                   [i_left, j_up], [i_left, j_down], [i_left, j], [i_right, j]];
  return neighbors
}

function detectNeighbor(i, j, x, z, matrix_value){
  //collect all neighbors in a list
  var neighbors = getNeighbors(i, j, x, z);
  //console.log(neighbors);
  //add the value of each neighbor
  var sum = 0;
  for (var i = 0; i < neighbors.length; i++) {
    sum += matrix_value[neighbors[i]];
  };
  return sum
}

function updateValue(x, z, matrix_value){
  var newValues = {};
  for (var i = 0; i < x; i++) {
    for (var j = 0; j < z; j++) {
      var sum = detectNeighbor(i,j,x,z,matrix_value);
      var pos = [i, j];
      if (matrix_value[pos] == 1) {
        if (sum < 3) {
          newValues[pos] = 1;
        }else if (sum > 4) {
          newValues[pos] = 0;
        }else {
          newValues[pos] = getRandomInt(2);
        }
      }else {
        if (sum >= 3) {
          newValues[pos] = 1;
        }else {
          newValues[pos] = getRandomInt(2);
        }
      }
    }
  }
  return newValues;
}

function move(point, value, factor){
  var y = 0;
  if (value == 0) {
    if (point[1] <= 0) {
      y = point[1] + (getRandomInt(3)+1)*0.1;
    }else if (point[1] >= 3) {
      y = point[1] - 5*0.5*factor/2;
    }else {
      y = point[1] - 1*0.1;
    }
  }else {
    if (point[1] >= 20) {
      y = point[1] - 10*((getRandomInt(3)+4)*0.3);
    }else {
      y = point[1] + (getRandomInt(3)+1)*0.05*factor;
    }
  }
  return [point[0], y, point[2]]
}

function updateMatrix(x, z, point_matrix, matrix_value, depth){
  for (var i = 0; i < x; i++) {
    for (var j = 0; j < z; j++) {
      point_matrix[[i,j]] = move(point_matrix[[i,j]], matrix_value[[i,j]], depth);
    }
  }
  return point_matrix
}

function scale(geometry, height){
  var y = height;
  if (height <= 1) {
    y = 0.3;
  }
  var scale = y*1.1 + 0.5;
  geometry.scale.set(scale, scale, scale);
  return geometry
}

function randomizer(randomization){
  randomization = true;
  return randomization
}

function randomizeColor(){
  const new_color = new THREE.Color(0xffffff);
  new_color.setHex(Math.random() * 0xffffff);
  return new_color
}

function expandColor(value, x, z, i, j){
  var alpha = 0.9;
	i = Number(i);
	j = Number(j);
	var pos = [i,j];
	var neighbors = getNeighbors(i, j, x, z);
	var cell_value = value[pos];
	//console.log([pos,matrixValue[pos], matrixValue]);
	if (cell_value == 0) {
		var index1 = effectController.pattern1;;
		var color1 = {'r':new THREE.Color(matrixColor[neighbors[index1]]).r,
									'g':new THREE.Color(matrixColor[neighbors[index1]]).g,
									'b':new THREE.Color(matrixColor[neighbors[index1]]).b};

		var interpolation = new THREE.Color();
		interpolation.r = color1.r+0.2;
		interpolation.g = color1.g+0.2;
		interpolation.b = color1.b+0.2;

	}else if (cell_value == 1) {
		var index1 = 1;
		var index2 = 4;
		var color1 = {'r':new THREE.Color(matrixColor[neighbors[index1]]).r,
									'g':new THREE.Color(matrixColor[neighbors[index1]]).g,
									'b':new THREE.Color(matrixColor[neighbors[index1]]).b};
		var color2 = {'r':new THREE.Color(matrixColor[neighbors[index2]]).r,
									'g':new THREE.Color(matrixColor[neighbors[index2]]).g,
									'b':new THREE.Color(matrixColor[neighbors[index2]]).b};
		var interpolation = new THREE.Color();
		interpolation.r = (color2.r + color1.r)/2 - color1.r;
		interpolation.g = (color2.g + color1.g)/2 - color1.g;
		interpolation.b = (color2.b + color1.b)/2 - color1.b;
	};

	if (interpolation.r <= 0.3) {
		interpolation.r = interpolation.r + (add_color1.r - interpolation.r)/7;
		interpolation.g = interpolation.g + (add_color1.g - interpolation.g)/7;
		interpolation.b = interpolation.b + (add_color1.b - interpolation.b)/7;
	}else if (interpolation.r > 0.3 && interpolation.r <= 0.6) {
		interpolation.r = interpolation.r + (add_color2.r - interpolation.r)/7;
		interpolation.g = interpolation.g + (add_color2.g - interpolation.g)/7;
		interpolation.b = interpolation.b + (add_color2.b - interpolation.b)/7;
	}else {
		interpolation.r = interpolation.r + (add_color3.r - interpolation.r)/7;
		interpolation.g = interpolation.g + (add_color3.g - interpolation.g)/7;
		interpolation.b = interpolation.b + (add_color3.b - interpolation.b)/7;
	};
  // if(interpolation.r <= 0.3 && interpolation.g <= 0.3 && interpolation.b <= 0.3) {
  //   var rgb_arr = [interpolation.r, interpolation.g, interpolation.b];
  //   if (StandardDeviation(rgb_arr) <= 0.05) {
  //     interpolation = backgroundColor;
  //   }
  // }
  // console.log(backgroundColor);
	return interpolation
}
  
function StandardDeviation(arr) {
    let mean = arr.reduce((acc, curr) => {
        return acc + curr
    }, 0) / arr.length;
    arr = arr.map((k) => {
        return (k - mean) ** 2
    });
    let sum = arr.reduce((acc, curr) => acc + curr, 0);
 
    // Calculating the variance
    let variance = sum / arr.length
 
    // Returning the standard deviation
    return Math.sqrt(sum / arr.length)
}

function setAttractPoints(num, x, z){
	if (num == 1) {
		j = getRandomInt(x);
		k = getRandomInt(z);
		var start = [j,k];
	}else {
		var start = [];
		for (var i = 0; i < num; i++) {
			j = getRandomInt(x);
			k = getRandomInt(z);
			start += [[j,k]];
		};
	};
	return start
}

// automatically update color pattern
function updateColor(value, x, z, i, j){
  if (effectController.generateMode == 'expand' && generate_switch == 'stop generate') {
    var output_color = expandColor(value, x, z, i, j);
  }else if (effectController.generateMode == 'movement' && generate_switch == 'stop generate') {

  };
	return output_color
}

function generateColor(button){
  if (button == 'start generate') {
    button = 'stop generate';
    console.log('start');
  }else {
    button = 'start generate';
    console.log('stop');
  };
  return button;
}

function resetColor(reset){
  reset = true;
  return reset
}

function getImg(getImageData){
	getImageData = true;
	return getImageData
}

// function save(renderer) {
//   if (getImageData) {
//     renderer.domElement.toBlob(function(blob) {
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = "image.bmp";
//       a.click();
//       URL.revokeObjectURL(url);
//       getImageData = false;
//       console.log(a.download);
//     }, "image/bmp");
//   }
// }

function btnSVGExportClick() {
  if (getImageData) {
    getImageData = false;
    var rendererSVG = new SVGRenderer();
    rendererSVG.setSize(window.innerWidth, window.innerHeight);
    rendererSVG.render(scene, camera);
    ExportToSVG(rendererSVG, "output.svg");
  }
}

function ExportToSVG(rendererSVG, filename) {
  var XMLS = new XMLSerializer();
  var svgfile = XMLS.serializeToString(rendererSVG.domElement);
  var svgData = svgfile;
  var preface = '<?xml version="1.0" standalone="no"?>\r\n';
  var svgBlob = new Blob([preface, svgData], {
    type: "image/svg+xml;charset=utf-8"
  });
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  
  downloadLink.href = svgUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
