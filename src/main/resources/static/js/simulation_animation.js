const canvas = document.getElementById('simulationCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const canvasWidth = canvas ? canvas.width : 0;
const canvasHeight = canvas ? canvas.height : 0;

let ball = canvas ? { x: 150, y: canvasHeight - 50, radius: 30, initialRadius: 30 } : {};
let pump = canvas ? { x: canvasWidth - 150, y: canvasHeight - 80, width: 40, height: 60 } : {};
let scales = canvas ? { x: 100, y: canvasHeight - 20, width: 100, height: 10 } : {};
let gauge = canvas ? { x: canvasWidth - 100, y: 50, radius: 40 } : {};

let displayMass = 0;
let displayPressure = 0;
let animationFrameId = null;
let simulationRunning = false;
let targetPressure = 0;
let targetMass = 0;
let initialPressure = 0;
let initialMass = 0;
let currentPressure = 0;
let currentMass = 0;
let animationProgress = 0;
const animationDuration = 2000; // ms
let animationStartTime = 0;

function drawBall(x, y, radius) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#FF8A65';
  ctx.fill();
  ctx.strokeStyle = '#BF360C';
  ctx.stroke();
  ctx.closePath();
}

function drawScales(x, y, width, height, mass) {
   if (!ctx) return;
   ctx.fillStyle = '#757575';
   ctx.fillRect(x, y, width, height);
   ctx.fillStyle = '#E0E0E0';
   ctx.fillRect(x + 10, y - 30, width - 20, 25);
   ctx.fillStyle = '#000';
   ctx.font = '14px Arial';
   ctx.textAlign = 'center';
   ctx.fillText(mass.toFixed(2) + " г", x + width / 2, y - 12);
}

function drawPump(x, y, width, height) {
   if (!ctx) return;
   ctx.fillStyle = '#607D8B';
   ctx.fillRect(x, y, width, height);
   ctx.fillStyle = '#455A64';
   ctx.fillRect(x + width / 2 - 5, y - 30, 10, 30);
}

function drawGauge(x, y, radius, pressure) {
   if (!ctx) return;
   ctx.beginPath();
   ctx.arc(x, y, radius, 0, Math.PI * 2);
   ctx.fillStyle = '#FFFFFF';
   ctx.fill();
   ctx.strokeStyle = '#000000';
   ctx.lineWidth = 2;
   ctx.stroke();
   ctx.closePath();

   ctx.font = '10px Arial';
   ctx.fillStyle = '#000';
   ctx.textAlign = 'center';
   ctx.fillText("P (Па)", x, y + radius - 5);

   const maxPressureVisual = 200000;
   const pressureRatio = Math.min(pressure / maxPressureVisual, 1);
   const angle = Math.PI * (pressureRatio - 0.5);

   ctx.beginPath();
   ctx.moveTo(x, y);
   ctx.lineTo(x + radius * 0.8 * Math.cos(angle), y + radius * 0.8 * Math.sin(angle));
   ctx.strokeStyle = 'red';
   ctx.lineWidth = 2;
   ctx.stroke();
   ctx.closePath();

   ctx.fillStyle = '#000';
   ctx.font = '12px Arial';
   ctx.fillText(Math.round(pressure) + "", x, y + 15);
}

function drawFrame() {
   if (!ctx) return;

   ctx.clearRect(0, 0, canvasWidth, canvasHeight);
   ctx.fillStyle = '#e0f2f7';
   ctx.fillRect(0, 0, canvasWidth, canvasHeight);

   if (simulationRunning) {
      const elapsed = Date.now() - animationStartTime;
      animationProgress = Math.min(elapsed / animationDuration, 1);

      currentPressure = initialPressure + (targetPressure - initialPressure) * animationProgress;
      currentMass = initialMass + (targetMass - initialMass) * animationProgress;

      const pressureDiff = targetPressure - initialPressure;
      const pressureRatio = pressureDiff === 0 ? 0 : (currentPressure - initialPressure) / pressureDiff;
      ball.radius = ball.initialRadius + (15 * Math.sqrt(Math.max(0, Math.min(1, pressureRatio))));


      displayMass = currentMass;
      displayPressure = currentPressure;

      if (animationProgress >= 1) {
        simulationRunning = false;
        displayMass = targetMass;
        displayPressure = targetPressure;
         ball.radius = ball.initialRadius + (targetPressure > initialPressure ? 15 : 0);
      }
   } else {
      currentPressure = displayPressure;
      currentMass = displayMass;
      const pressureDiff = targetPressure - initialPressure;
      const pressureRatio = pressureDiff === 0 ? 0 : (currentPressure - initialPressure) / pressureDiff;
      ball.radius = ball.initialRadius + (15 * Math.sqrt(Math.max(0, Math.min(1, pressureRatio))));
   }

   if (canvas) {
      drawScales(scales.x, scales.y, scales.width, scales.height, displayMass);
      drawBall(ball.x, ball.y - ball.radius, ball.radius);
      drawPump(pump.x, pump.y, pump.width, pump.height);
      drawGauge(gauge.x, gauge.y, gauge.radius, displayPressure);
   }

   if (simulationRunning) {
      animationFrameId = requestAnimationFrame(drawFrame);
   }
}

window.startSimulationAnimation = function(params) {
   if (!canvas) return;

   if (simulationRunning) {
      cancelAnimationFrame(animationFrameId);
   }
   targetPressure = params.finalPressure;
   targetMass = params.finalMass;
   initialPressure = params.initialPressure;
   initialMass = params.initialMass;

   displayPressure = initialPressure;
   displayMass = initialMass;
   if (ball) ball.radius = ball.initialRadius;

   simulationRunning = true;
   animationProgress = 0;
   animationStartTime = Date.now();
   animationFrameId = requestAnimationFrame(drawFrame);
};

window.resetAnimation = function() {
   if (!canvas) return;

   if (simulationRunning) {
      cancelAnimationFrame(animationFrameId);
      simulationRunning = false;
   }
   initialPressure = parseFloat($("#P1").val()) || 0;
   initialMass = parseFloat($("#M1").val()) || 0;
   displayPressure = initialPressure;
   displayMass = initialMass;
   targetPressure = initialPressure;
   targetMass = initialMass;
    if (ball) ball.radius = ball.initialRadius;

   requestAnimationFrame(drawFrame);
};

window.addEventListener('load', () => {
  if (canvas && ctx) {
     initialPressure = parseFloat($("#P1").val()) || 101325;
     initialMass = parseFloat($("#M1").val()) || 0;
     displayPressure = initialPressure;
     displayMass = initialMass;
     targetPressure = initialPressure;
     targetMass = initialMass;
      if (ball) {
        ball.initialRadius = 30;
        ball.radius = ball.initialRadius;
      }
     drawFrame();
  } else {
     console.warn("Simulation canvas not found or context could not be created.");
  }
});
