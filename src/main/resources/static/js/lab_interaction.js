$(function(){
  const ball          = $('#ball');
  const pumpArea      = $('#pump-area');
  const scalesArea    = $('#scales-area');
  const gaugeNeedle   = $('.gauge-needle');
  const gaugeValue    = $('#gauge-value');
  const thermoLiquid  = $('.thermo-liquid');
  const thermoValue   = $('#thermo-value');
  const scalesDisplay = $('#scales-mass-display');
  const errorBox      = $('#error-message');
  const gasSelect     = $('#gasSelect');
  const inputT        = $('#T');
  const inputV        = $('#V');
  const inputP1       = $('#P1');
  const inputM1       = $('#M1');
  const resultM2      = $('#result-m2');
  const resultM       = $('#result-M');
  const form          = $('#paramsForm');

  const cssRoot = document.documentElement;
  const getCssVar = (name, fallback) => {
    const value = getComputedStyle(cssRoot).getPropertyValue(name);
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  const config = {
    pumpMaxPressure: getCssVar('--pump-max-pressure', 300000),
    pressureDisplayMax: getCssVar('--pressure-display-max', 300),
    ballMaxScale: getCssVar('--ball-max-scale', 1.5),
    ballInitialTop: getComputedStyle(cssRoot).getPropertyValue('--ball-initial-top').trim() || '60%',
    ballInitialLeft: getComputedStyle(cssRoot).getPropertyValue('--ball-initial-left').trim() || '45%',
    pressureStep: 2000,
    pumpIntervalTime: 50,
    calculationInProgress: false
  };

  console.log("Configuration:", config);

  let simState = {
    gasId: null,
    initialP1: 101325,
    initialM1_g: 1.17,
    V_m3: 0.01,
    T_celsius: 20,
    currentPressure: 101325,
    currentMass_g: 1.17,
    pumpInterval: null,
    isDragging: false,
    isPumping: false,
    startX: 0, startY: 0,
    origX: 0, origY: 0
  };

  function updateGauge() {
    const currentKPa = simState.currentPressure / 1000;
    gaugeValue.text(currentKPa.toFixed(1) + ' кПа');
    const pressureRatio = Math.min(1, Math.max(0, currentKPa / config.pressureDisplayMax));
    const angle = -135 + pressureRatio * 270;
    gaugeNeedle.css('transform', `translate(-50%, 0) rotate(${angle}deg)`);
  }

  function updateThermo() {
    thermoValue.text(simState.T_celsius.toFixed(0) + ' °C');
    const minTemp = -20;
    const maxTemp = 100;
    const range = maxTemp - minTemp;
    const tempRatio = Math.min(1, Math.max(0, (simState.T_celsius - minTemp) / range));
    thermoLiquid.css('height', (tempRatio * 100) + '%');
  }

  function updateBallAppearance() {
    const pressureRange = config.pumpMaxPressure - simState.initialP1;
    let pressureIncreaseRatio = 0;
    if (pressureRange > 1e-6) {
      pressureIncreaseRatio = Math.max(0, Math.min(1, (simState.currentPressure - simState.initialP1) / pressureRange));
    } else if (simState.currentPressure > simState.initialP1) {
      pressureIncreaseRatio = 1;
    }

    const scaleFactor = 1 + pressureIncreaseRatio * (config.ballMaxScale - 1);

    if (ball.hasClass('ball-at-pump')) {
      ball.css('transform', `scale(${scaleFactor})`);
    } else {
      ball.css('transform', 'scale(1)');
    }
  }

  function updateScalesDisplay(mass_g = null) {
    if (mass_g === null || isNaN(mass_g)) {
      scalesDisplay.text('- г');
    } else {
      scalesDisplay.text(mass_g.toFixed(3) + ' г');
    }
  }

  function readParamsFromForm() {

    const P1_val = parseFloat(inputP1.val());
    const M1_val = parseFloat(inputM1.val());
    const V_val = parseFloat(inputV.val());
    const T_val = parseFloat(inputT.val());
    const gasId_val = gasSelect.val();

    simState.gasId = gasId_val;
    simState.initialP1 = P1_val;
    simState.initialM1_g = M1_val;
    simState.V_m3 = V_val;
    simState.T_celsius = T_val;

    simState.currentPressure = simState.initialP1;
    simState.currentMass_g = simState.initialM1_g;

    updateGauge(); updateThermo(); updateBallAppearance();
    updateScalesDisplay(simState.currentMass_g);
    resultM2.text('-'); resultM.text('-');

    return true;
  }

  function startPumping() {
    if (simState.isPumping || simState.pumpInterval) return;
    simState.isPumping = true;

    simState.pumpInterval = setInterval(() => {
      if (!simState.isPumping) {
        clearInterval(simState.pumpInterval);
        simState.pumpInterval = null;
        return;
      }

      if (simState.currentPressure < config.pumpMaxPressure) {
        simState.currentPressure += config.pressureStep;
        if (simState.currentPressure > config.pumpMaxPressure) {
          simState.currentPressure = config.pumpMaxPressure;
        }
        updateGauge();
        updateBallAppearance();
      } else {
        simState.currentPressure = config.pumpMaxPressure;
        updateGauge();
        updateBallAppearance();
        stopPumping();
      }
    }, config.pumpIntervalTime);
  }

  function stopPumping() {
    let stoppedNow = false;
    if (simState.pumpInterval) {
      clearInterval(simState.pumpInterval);
      simState.pumpInterval = null;
      stoppedNow = true;
    }
    if (simState.isPumping) {
      simState.isPumping = false;
      updateBallAppearance();
    } else if (stoppedNow) {
      updateBallAppearance();
    }
  }

  function resetBallPositionAndState() {
    stopPumping();
    ball.removeClass('ball-at-pump ball-on-scales');
    ball.css({
            left: config.ballInitialLeft,
            top: config.ballInitialTop,
            cursor: 'grab',
            transform: 'scale(1)'
        });
    simState.currentPressure = simState.initialP1;
    simState.currentMass_g = simState.initialM1_g;
    updateGauge();
    updateScalesDisplay(simState.currentMass_g);
    resultM2.text('-');
    resultM.text('-');
  }

  function calculateResults() {
    config.calculationInProgress = true;

    const pressureDifference = simState.currentPressure - simState.initialP1;
    const dataForM2 = { gasId: simState.gasId, m1: simState.initialM1_g, P1: simState.initialP1, P2: simState.currentPressure, V: simState.V_m3, T: simState.T_celsius };
    resultM2.text("Расчет..."); resultM.text('-');

    $.post('/calculate_final_mass', dataForM2)
      .done(respM2 => {
        if (respM2.final_mass_g != null && !isNaN(respM2.final_mass_g)) {
          simState.currentMass_g = respM2.final_mass_g;
          updateScalesDisplay(simState.currentMass_g);
          resultM2.text(simState.currentMass_g.toFixed(3));

          const dataForM = { m1: simState.initialM1_g, m2: simState.currentMass_g, p1: simState.initialP1, p2: simState.currentPressure, v: simState.V_m3, t: simState.T_celsius };
          resultM.text("Расчет...");

          $.ajax({ url: '/calculate_molar_mass', method: 'POST', contentType: 'application/json', data: JSON.stringify(dataForM) })
            .done(respM => {
              console.log("Response from /calculate_molar_mass:", respM);
              if (respM.molar_mass_kg_mol != null && !isNaN(respM.molar_mass_kg_mol)) {
                const molarMassGramsMol = respM.molar_mass_kg_mol * 1000;
                resultM.text(molarMassGramsMol.toFixed(3)); displayError('');
              }
            }).fail((jqXHR, textStatus, errorThrown) => {
              console.error("AJAX Error /calculate_molar_mass:", textStatus, errorThrown, jqXHR.responseText);
              const serverMsg = jqXHR.responseJSON ? jqXHR.responseJSON.message : 'Нет ответа или ошибка сети.';
              displayError('Ошибка связи при расчёте M: ' + serverMsg); resultM.text('-');
            }).always(() => { config.calculationInProgress = false; });

        } else { displayError('Ошибка: Сервер вернул некорректное значение m₂.'); resultM2.text('-'); resultM.text('-'); config.calculationInProgress = false; }
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        console.error("AJAX Error /calculate_final_mass:", textStatus, errorThrown, jqXHR.responseText);
        const serverMsg = jqXHR.responseJSON ? jqXHR.responseJSON.message : 'Нет ответа или ошибка сети.';
        displayError('Ошибка связи при расчёте m₂: ' + serverMsg); resultM2.text('-'); resultM.text('-'); config.calculationInProgress = false;
      });
  }

  function isOver(x, y, el) {
    const o = el.offset();
    const w = el.width();
    const h = el.height();
    return x >= o.left && x <= o.left + w && y >= o.top  && y <= o.top + h;
  }

  ball.on('mousedown touchstart', function(e) {
    e.preventDefault();
    console.log("mousedown/touchstart event triggered");

    stopPumping();

    ball.removeClass('ball-at-pump');
    updateBallAppearance();

    simState.isDragging = true;
    const evt = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    simState.startX = evt.clientX; simState.startY = evt.clientY;
    const ballPos = ball.position(); simState.origX = ballPos.left; simState.origY = ballPos.top;
    ball.css('cursor', 'grabbing'); displayError('');
  });

  $(document).on('mousemove touchmove', function(e) {
    if (!simState.isDragging) return;

    const evt = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    const dx = evt.clientX - simState.startX; const dy = evt.clientY - simState.startY;
    const newX = simState.origX + dx; const newY = simState.origY + dy;
    ball.css({ left: newX, top: newY });
  });

  $(document).on('mouseup touchend', function(e) {
    if (!simState.isDragging) return;
    simState.isDragging = false;
    ball.css('cursor', 'grab');

    stopPumping();

    const evt = e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0] : e;
    const finalX = evt.clientX; const finalY = evt.clientY;

    if (isOver(finalX, finalY, scalesArea)) {
      ball.removeClass('ball-at-pump').addClass('ball-on-scales');
      const scalesOffset = scalesArea.offset(), scalesCenterX = scalesOffset.left + scalesArea.width() / 2;
      const ballWidth = ball.width(), ballHeight = ball.height(), parentOffset = ball.parent().offset();
      let targetX = scalesCenterX - parentOffset.left - ballWidth / 2;
      let targetY = scalesOffset.top - parentOffset.top - ballHeight + 100;
      ball.css({ left: targetX + 'px', top: targetY + 'px', transform: 'scale(1)'});
      calculateResults();

    } else if (isOver(finalX, finalY, pumpArea)) {
      console.log("Ball dropped on pump - starting pump");
      ball.removeClass('ball-on-scales').addClass('ball-at-pump');
      const pumpOffset = pumpArea.offset(), pumpCenterX = pumpOffset.left + pumpArea.width() / 2;
      const ballWidth = ball.width(), ballHeight = ball.height(), parentOffset = ball.parent().offset();
      let targetX = pumpCenterX - parentOffset.left - ballWidth / 2;
      let targetY = pumpOffset.top - parentOffset.top - ballHeight + 360;
      ball.css({ left: targetX + 'px', top: targetY + 'px' });
      updateBallAppearance();
      startPumping();

    } else {
      ball.removeClass('ball-at-pump ball-on-scales');
      resetBallPositionAndState();
    }
  });

  form.on('change', 'input, select', function() {
    console.log("Form parameter changed");
    const paramsValid = readParamsFromForm();
    if (paramsValid && (ball.hasClass('ball-at-pump') || ball.hasClass('ball-on-scales'))) {
      resetBallPositionAndState();
    } else if (!paramsValid) {
      resetBallPositionAndState();
    }
  });

});
