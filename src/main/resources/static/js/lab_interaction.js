$(function () {
  // DOM‑элементы
  const ball = $('#ball');
  const pumpArea = $('#pump-area');
  const scalesArea = $('#scales-area');
  const gaugeNeedle = $('.gauge-needle');
  const gaugeValue = $('#gauge-value');
  const thermoLiquid = $('.thermo-liquid');
  const thermoValue = $('#thermo-value');
  const scalesDisplay = $('#scales-mass-display');
  const errorBox = $('#error-message');
  const gasSelect = $('#gasSelect');
  const inputT = $('#T');
  const inputV = $('#V');
  const inputP1 = $('#P1');
  const inputM1 = $('#M1');
  const resultM2 = $('#result-m2');
  const resultM = $('#result-M');
  const form = $('#paramsForm');
  const resetButton = $('#resetButton');

  // Конфигурация из CSS Custom Properties
  const cssRoot = document.documentElement;

  /** Возвращает числовое значение CSS‑переменной или fallback. */
  const getCssVar = (name, fallback) => {
    const value = getComputedStyle(cssRoot).getPropertyValue(name);
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  };

  const config = {
    pumpMaxPressure: getCssVar('--pump-max-pressure', 300000),
    pressureDisplayMax: getCssVar('--pressure-display-max', 300),
    ballMaxScale: getCssVar('--ball-max-scale', 1.5),
    ballInitialTop: getComputedStyle(cssRoot).getPropertyValue('--ball-initial-top').trim() || '60%',
    ballInitialLeft: getComputedStyle(cssRoot).getPropertyValue('--ball-initial-left').trim() || '45%',
    pressureStep: 2000, // Па за тик
    pumpIntervalTime: 50, // мс
    calculationInProgress: false,
  };

  // Состояние симуляции (меняется во время работы)
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
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  };

  // ФУНКЦИИ ОБНОВЛЕНИЯ UI

  /** Обновляет манометр. */
  function updateGauge() {
    const currentKPa = simState.currentPressure / 1000;
    gaugeValue.text(currentKPa.toFixed(1) + ' кПа');

    // Нормализуем давление (0..1) и переводим в угол (-135 .. +135)
    const pressureRatio = Math.min(1, Math.max(0, currentKPa / config.pressureDisplayMax));
    const angle = -135 + pressureRatio * 270;
    gaugeNeedle.css('transform', `translate(-50%, 0) rotate(${angle}deg)`);
  }

  /** Обновляет термометр. */
  function updateThermo() {
    thermoValue.text(simState.T_celsius.toFixed(0) + ' °C');

    const minTemp = 0;
    const maxTemp = 50;
    const range = maxTemp - minTemp;
    const tempRatio = Math.min(1, Math.max(0, (simState.T_celsius - minTemp) / range));
    thermoLiquid.css('height', tempRatio * 100 + '%');
  }

  /** Изменяет масштаб шара в зависимости от текущего давления. */
  function updateBallAppearance() {
    const pressureRange = config.pumpMaxPressure - simState.initialP1;
    let pressureIncreaseRatio = 0;

    if (pressureRange > 1e-6) {
      pressureIncreaseRatio = Math.max(0, Math.min(1, (simState.currentPressure - simState.initialP1) / pressureRange));
    } else if (simState.currentPressure > simState.initialP1) {
      pressureIncreaseRatio = 1;
    }

    const scaleFactor = 1 + pressureIncreaseRatio * (config.ballMaxScale - 1);
    ball.css('transform', `scale(${scaleFactor})`);
  }

  /** Отображает массу на экране весов. */
  function updateScalesDisplay(mass_g = null) {
    scalesDisplay.text(mass_g === null || isNaN(mass_g) ? '- г' : mass_g.toFixed(3) + ' г');
  }

  /** Показывает сообщение об ошибке. */
  function displayError(message) {
    errorBox.text(message || '');
    if (message) console.error('Simulation Error:', message);
  }

  // ОСНОВНАЯ ЛОГИКА СИМУЛЯЦИИ

  /** Читает параметры формы, валидирует их и сбрасывает текущее состояние. */
  function readParamsAndResetCurrentState() {
    let hasError = false;
    displayError('');

    const P1_val = parseFloat(inputP1.val());
    const M1_val = parseFloat(inputM1.val());
    const V_val = parseFloat(inputV.val());
    const T_val = parseFloat(inputT.val());
    const gasId_val = gasSelect.val();

    // Валидация
    if (!gasId_val) {
      displayError('Ошибка: Газ не выбран!');
      hasError = true;
    }
    if (isNaN(P1_val) || P1_val <= 0) {
      displayError('Ошибка: Давление P₁ должно быть > 0 Па.');
      hasError = true;
    }
    if (isNaN(M1_val) || M1_val < 0) {
      displayError('Ошибка: Масса m₁ должна быть ≥ 0 г.');
      hasError = true;
    }
    if (isNaN(V_val) || V_val <= 0) {
      displayError('Ошибка: Объем V должен быть > 0 м³.');
      hasError = true;
    }
    if (isNaN(T_val)) {
      displayError('Ошибка: Температура T должна быть числом (°C).');
      hasError = true;
    } else if (T_val <= -273.15) {
      displayError('Ошибка: Температура T не может быть ≤ -273.15 °C.');
      hasError = true;
    }
    if (hasError) return false;

    // Обновляем базовые параметры
    simState.gasId = gasId_val;
    simState.initialP1 = P1_val;
    simState.initialM1_g = M1_val;
    simState.V_m3 = V_val;
    simState.T_celsius = T_val;

    // Сбрасываем текущие значения к начальным
    simState.currentPressure = simState.initialP1;
    simState.currentMass_g = simState.initialM1_g;

    // Обновляем интерфейс
    updateGauge();
    updateThermo();
    updateBallAppearance();
    updateScalesDisplay(simState.currentMass_g);
    resultM2.text('-');
    resultM.text('-');

    console.log('Parameters read/reset state:', simState);
    return true;
  }

  /** Запускает интервал накачки насоса. */
  function startPumping() {
    if (simState.isPumping || simState.pumpInterval) return;
    simState.isPumping = true;
    console.log('Starting pumping...');

    simState.pumpInterval = setInterval(() => {
      if (!simState.isPumping) {
        clearInterval(simState.pumpInterval);
        simState.pumpInterval = null;
        return;
      }

      if (simState.currentPressure < config.pumpMaxPressure) {
        simState.currentPressure = Math.min(config.pumpMaxPressure, simState.currentPressure + config.pressureStep);
        updateGauge();
        updateBallAppearance();
      } else {
        stopPumping();
        console.log('Max pressure reached.');
      }
    }, config.pumpIntervalTime);
  }

  /** Останавливает интервал накачки. */
  function stopPumping() {
    if (simState.pumpInterval) {
      clearInterval(simState.pumpInterval);
      simState.pumpInterval = null;
    }
    if (simState.isPumping) {
      simState.isPumping = false;
      console.log('Pumping stopped at pressure:', simState.currentPressure.toFixed(0));
    }
  }

  /** Полный сброс симуляции к параметрам формы. */
  function resetSimulation() {
    console.log('Executing full simulation reset...');
    stopPumping();

    ball.removeClass('ball-at-pump ball-on-scales');

    // Сброс параметров и UI
    if (!readParamsAndResetCurrentState()) {
      console.warn('Error reading form on reset, resetting position only.');
      simState.currentPressure = simState.initialP1;
      simState.currentMass_g = simState.initialM1_g;
      updateGauge();
      updateScalesDisplay(simState.currentMass_g);
    }

    updateBallAppearance();
    ball.css({
      left: config.ballInitialLeft,
      top: config.ballInitialTop,
      cursor: 'grab',
    });

    resultM2.text('-');
    resultM.text('-');
  }

  /** Возвращает шар к исходной позиции без изменения давления. */
  function returnBallToStartPosition() {
    console.log('Returning ball to start position without state reset.');
    stopPumping();

    ball.removeClass('ball-at-pump ball-on-scales');
    ball.css({
      left: config.ballInitialLeft,
      top: config.ballInitialTop,
      cursor: 'grab',
    });
  }

  /** Отправляет данные на сервер для расчётов m₂ и M. */
  function calculateResults() {
    if (config.calculationInProgress) {
      console.warn('Calculation already in progress...');
      return;
    }

    config.calculationInProgress = true;
    displayError('');

    if (!simState.gasId) {
      displayError('Ошибка: Газ не выбран для расчета!');
      config.calculationInProgress = false;
      return;
    }

    if (simState.currentPressure - simState.initialP1 < 1) {
      displayError(`Ошибка: Конечное давление P₂ (${simState.currentPressure.toFixed(0)}) не больше начального P₁ (${simState.initialP1.toFixed(0)}).`);
      resultM2.text('-');
      resultM.text('-');
      config.calculationInProgress = false;
      return;
    }

    const dataForM2 = {
      gasId: simState.gasId,
      m1: simState.initialM1_g,
      P1: simState.initialP1,
      P2: simState.currentPressure,
      V: simState.V_m3,
      T: simState.T_celsius,
    };

    console.log('Sending data to /calculate_final_mass:', dataForM2);
    resultM2.text('Расчет...');
    resultM.text('-');

    $.post('/calculate_final_mass', dataForM2)
      .done((respM2) => {
        console.log('Response from /calculate_final_mass:', respM2);

        if (respM2.message) {
          displayError('Ошибка расчета m₂: ' + respM2.message);
          resultM2.text('-');
          resultM.text('-');
          config.calculationInProgress = false;
          return;
        }

        if (respM2.final_mass_g != null && !isNaN(respM2.final_mass_g)) {
          simState.currentMass_g = respM2.final_mass_g;
          updateScalesDisplay(simState.currentMass_g);
          resultM2.text(simState.currentMass_g.toFixed(3));

          const dataForM = {
            m1: simState.initialM1_g,
            m2: simState.currentMass_g,
            p1: simState.initialP1,
            p2: simState.currentPressure,
            v: simState.V_m3,
            t: simState.T_celsius,
          };

          console.log('Sending data to /calculate_molar_mass:', dataForM);
          resultM.text('Расчет...');

          $.ajax({
            url: '/calculate_molar_mass',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(dataForM),
          })
            .done((respM) => {
              console.log('Response from /calculate_molar_mass:', respM);

              if (respM.message) {
                displayError('Ошибка расчета M: ' + respM.message);
                resultM.text('-');
              } else if (respM.molar_mass_kg_mol != null && !isNaN(respM.molar_mass_kg_mol)) {
                resultM.text((respM.molar_mass_kg_mol * 1000).toFixed(3));
                displayError('');
              } else {
                displayError('Ошибка: Сервер не вернул корректную M.');
                resultM.text('-');
              }
            })
            .fail((jqXHR) => {
              const serverMsg = jqXHR.responseJSON ? jqXHR.responseJSON.message : 'Ошибка сети.';
              displayError('Ошибка связи при расчёте M: ' + serverMsg);
              resultM.text('-');
            })
            .always(() => {
              config.calculationInProgress = false;
            });
        } else {
          displayError('Ошибка: Сервер вернул некорректное значение m₂.');
          resultM2.text('-');
          resultM.text('-');
          config.calculationInProgress = false;
        }
      })
      .fail((jqXHR) => {
        const serverMsg = jqXHR.responseJSON ? jqXHR.responseJSON.message : 'Ошибка сети.';
        displayError('Ошибка связи при расчёте m₂: ' + serverMsg);
        resultM2.text('-');
        resultM.text('-');
        config.calculationInProgress = false;
      });
  }

  // ОБРАБОТЧИКИ СОБЫТИЙ

  /** Определяет, попадает ли координата (x, y) внутрь элемента. */
  function isOver(x, y, el) {
    const o = el.offset();
    const w = el.width();
    const h = el.height();
    return x >= o.left && x <= o.left + w && y >= o.top && y <= o.top + h;
  }

  // Drag & Drop: старт
  ball.on('mousedown touchstart', function (e) {
    e.preventDefault();

    // Проверяем выбор газа / параметры
    if (!simState.gasId) {
      if (!readParamsAndResetCurrentState() || !simState.gasId) {
        displayError('Ошибка: Сначала выберите газ!');
        return;
      }
    }

    stopPumping();

    // Устанавливаем флаг и запоминаем координаты
    simState.isDragging = true;
    const evt = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    simState.startX = evt.clientX;
    simState.startY = evt.clientY;

    const ballPos = ball.position();
    simState.origX = ballPos.left;
    simState.origY = ballPos.top;

    ball.css('cursor', 'grabbing');
    displayError('');
    console.log('Drag start');
  });

  // Drag & Drop: движение
  $(document).on('mousemove touchmove', function (e) {
    if (!simState.isDragging) return;
    const evt = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    const dx = evt.clientX - simState.startX;
    const dy = evt.clientY - simState.startY;

    ball.css({
      left: simState.origX + dx,
      top: simState.origY + dy,
    });
  });

  // Drag & Drop: окончание
  $(document).on('mouseup touchend', function (e) {
    if (!simState.isDragging) return;
    simState.isDragging = false;
    ball.css('cursor', 'grab');

    stopPumping();

    const evt = e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0] : e;
    const finalX = evt.clientX;
    const finalY = evt.clientY;

    console.log('Drop detected. Pressure:', simState.currentPressure.toFixed(0));

    if (isOver(finalX, finalY, scalesArea)) {
      // На весах
      console.log('Ball dropped on scales');
      ball.removeClass('ball-at-pump').addClass('ball-on-scales');

      const scalesOffset = scalesArea.offset();
      const scalesCenterX = scalesOffset.left + scalesArea.width() / 2;
      const ballWidth = ball.width();
      const ballHeight = ball.height();
      const parentOffset = ball.parent().offset();

      const targetX = scalesCenterX - parentOffset.left - ballWidth / 2;
      const targetY = scalesOffset.top - parentOffset.top - ballHeight + 100;

      ball.css({ left: targetX + 'px', top: targetY + 'px' });
      calculateResults();
    } else if (isOver(finalX, finalY, pumpArea)) {
      // На насосе
      console.log('Ball dropped on pump - starting pump');
      ball.removeClass('ball-on-scales').addClass('ball-at-pump');

      const pumpOffset = pumpArea.offset();
      const pumpCenterX = pumpOffset.left + pumpArea.width() / 2;
      const ballWidth = ball.width();
      const ballHeight = ball.height();
      const parentOffset = ball.parent().offset();

      const targetX = pumpCenterX - parentOffset.left - ballWidth / 2;
      const targetY = pumpOffset.top - parentOffset.top - ballHeight + 360;

      ball.css({ left: targetX + 'px', top: targetY + 'px' });
      startPumping();
    } else {
      // ---------- Мимо ----------
      console.log('Ball dropped elsewhere - Returning to start position.');
      returnBallToStartPosition();
    }
  });

  // Изменение параметров формы → полный сброс
  form.on('change', 'input, select', function () {
    console.log('Form parameter changed, executing full reset.');
    resetSimulation();
  });

  // Кнопка "Сброс" → полный сброс
  resetButton.on('click', function () {
    console.log('Reset button clicked.');
    resetSimulation();
  });

  // ИНИЦИАЛИЗАЦИЯ
  if (!readParamsAndResetCurrentState()) {
    console.warn('Initial parameters invalid!');
  }
  updateScalesDisplay(simState.initialM1_g);
  console.log('Lab initialized.');
});

