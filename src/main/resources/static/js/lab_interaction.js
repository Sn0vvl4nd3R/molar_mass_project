$(function(){
  const ball         = $('#ball');
  const pumpArea     = $('#pump-area');
  const scalesArea   = $('#scales-area');
  const gaugeNeedle  = $('.gauge-needle');
  const gaugeValue   = $('#gauge-value');
  const thermoLiquid = $('.thermo-liquid');
  const thermoValue  = $('#thermo-value');
  const scalesDisplay= $('#scales-mass-display');
  const errorBox     = $('#error-message');

  let gasId, P1, m1, V, T;
  let currentPressure;
  let pumpInterval;
  let isDragging = false, pumping = false;
  let startX, startY, origX, origY;

  function readParams() {
    gasId = $('#gasSelect').val();
    P1    = parseFloat($('#P1').val()) || 101325;
    m1    = parseFloat($('#M1').val()) || 1.17;
    V     = parseFloat($('#V').val())  || 0.01;
    T     = parseFloat($('#T').val())  || 20;
    currentPressure = P1;
    updateGauge(); updateThermo(); updateBall();
    scalesDisplay.text(m1.toFixed(2) + ' г');
    errorBox.text('');
  }

  function updateGauge() {
    const kPa = currentPressure / 1000;
    gaugeValue.text(kPa.toFixed(1) + ' кПа');
    const angle = -135 + (kPa / 300) * 270;
    gaugeNeedle.css('transform', `translate(-50%,0) rotate(${angle}deg)`);
  }

  function updateThermo() {
    thermoValue.text(T.toFixed(0) + ' °C');
    const pct = Math.min(1, Math.max(0, (T + 20) / 120));
    const tubeH = $('#thermometer').height();
    thermoLiquid.css('height', (pct * tubeH) + 'px');
  }

  function updateBall() {
    const ratio = Math.min(1, (currentPressure - P1) / (300000 - P1));
    ball.css('--pressure-ratio', ratio);
  }

  function startPumping() {
    if (pumpInterval) return;
    pumpInterval = setInterval(() => {
      if (currentPressure >= 300000) stopPumping();
      else {
        currentPressure += 1000; updateGauge(); updateBall();
      }
    }, 50);
  }

  function stopPumping() {
    clearInterval(pumpInterval);
    pumpInterval = null;
  }

  function resetBall() {
    ball.removeClass('ball-at-pump ball-on-scales')
        .css({ left: 'var(--ball-left)', top: 'var(--ball-top)' });
    updateGauge(); updateBall();
  }

  function calculateResults() {
    stopPumping();
    scalesDisplay.text(m1.toFixed(2) + ' г');
    $.post('/calculate_final_mass', { gasId, m1, P1, P2: currentPressure, V, T })
      .done(resp => {
        if (resp.message) { errorBox.text(resp.message); return; }
        if (resp.final_mass_g != null) {
          const m2 = resp.final_mass_g;
          $('#result-m2').text(m2.toFixed(3));
          $.ajax({
            url: '/calculate_molar_mass', method: 'POST', contentType: 'application/json',
            data: JSON.stringify({ m1, m2, P1, P2: currentPressure, V, T })
          }).done(r2 => {
            if (r2.message) { errorBox.text(r2.message); return; }
            $('#result-M').text((r2.molar_mass_kg_mol * 1000).toFixed(3));
          }).fail(() => errorBox.text('Ошибка расчёта M'));
        } else {
          errorBox.text('Ошибка расчёта m₂');
        }
      }).fail(() => errorBox.text('Ошибка связи'));
  }

  function isOver(x, y, el) {
    const o = el.offset();
    return x >= o.left && x <= o.left + el.width() &&
           y >= o.top  && y <= o.top  + el.height();
  }

  ball.on('mousedown touchstart', function(e) {
    e.preventDefault();
    readParams();
    stopPumping(); pumping = false;
    const evt = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    isDragging = true;
    startX = evt.clientX; startY = evt.clientY;
    origX = ball.position().left; origY = ball.position().top;
    ball.css('cursor', 'grabbing');
  });

  $(document).on('mousemove touchmove', function(e) {
    if (!isDragging) return;
    e.preventDefault();
    const evt = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
    const dx = evt.clientX - startX, dy = evt.clientY - startY;
    ball.css({ left: origX + dx, top: origY + dy });
    const x = evt.clientX, y = evt.clientY;
    if (isOver(x, y, pumpArea)) {
      ball.addClass('ball-at-pump').removeClass('ball-on-scales');
      if (!pumping) { pumping = true; startPumping(); }
    } else {
      if (pumping) { pumping = false; stopPumping(); }
    }
  }).on('mouseup touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    ball.css('cursor', 'grab');
    if (pumping) { pumping = false; stopPumping(); }
    const evt = e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0] : e;
    const x = evt.clientX, y = evt.clientY;
    if (isOver(x, y, scalesArea)) {
      ball.addClass('ball-on-scales').removeClass('ball-at-pump');
      calculateResults();
    } else if (!isOver(x, y, pumpArea)) {
      resetBall();
    }
  });

  $('#paramsForm input, #paramsForm select').on('change', function() {
    readParams();
    scalesDisplay.text('- г');
    $('#result-m2').text('-');
    $('#result-M').text('-');
  });

  readParams();
  ball.css('cursor', 'grab');
});
