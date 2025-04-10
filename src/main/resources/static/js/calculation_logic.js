$(document).ready(function () {

  $("#calculationForm").on("submit", function (event) {
    event.preventDefault();

    $("#result-molar-mass").text("-");
    $("#error").text("");

    const m1_g = parseFloat($("#M1").val());
    const m2_g = parseFloat($("#M2").val());
    const P1_pa = parseFloat($("#P1").val());
    const P2_pa = parseFloat($("#P2").val());
    const V_m3 = parseFloat($("#V").val());
    const T_c = parseFloat($("#T").val());

    let isValid = true;
    if (isNaN(m1_g) || isNaN(m2_g) || isNaN(P1_pa) || isNaN(P2_pa) || isNaN(V_m3) || isNaN(T_c)) {
      $("#error").text("Ошибка: Все поля должны содержать числовые значения.");
      isValid = false;
    } else if (V_m3 <= 0) {
      $("#error").text("Ошибка: Объем (V) должен быть положительным.");
      isValid = false;
    } else if (T_c <= -273.15) {
      $("#error").text("Ошибка: Температура (T) должна быть выше абсолютного нуля.");
       isValid = false;
    } else if (P2_pa <= P1_pa) {
      $("#error").text("Ошибка: Конечное давление (P2) должно быть больше начального (P1).");
       isValid = false;
    } else if (m2_g <= m1_g) {
      $("#error").text("Ошибка: Конечная масса (m2) должна быть больше начальной (m1).");
       isValid = false;
    }

    if (!isValid) {
       if (typeof window.resetAnimation === 'function') {
        window.resetAnimation();
       }
      return;
    }

    if (typeof window.startSimulationAnimation === 'function') {
      window.startSimulationAnimation({
        initialPressure: P1_pa,
        finalPressure: P2_pa,
        initialMass: m1_g,
        finalMass: m2_g
      });
    }


    $.ajax({
      url: "/calculate_molar_mass",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        m1: m1_g,
        m2: m2_g,
        p1: P1_pa,
        p2: P2_pa,
        v: V_m3,
        t: T_c
      }),
      dataType: "json",
      success: function(response) {
        if (response.message) {
          $("#error").text(response.message);
          $("#result-molar-mass").text("Ошибка");
        } else if (response.molar_mass_kg_mol !== undefined) {
          const molarMassGrams = response.molar_mass_kg_mol * 1000.0;
          if (isNaN(molarMassGrams) || !isFinite(molarMassGrams) || molarMassGrams <= 0) {
             $("#error").text("Ошибка: Рассчитанное значение M некорректно.");
             $("#result-molar-mass").text("Ошибка");
          } else {
             $("#result-molar-mass").text(molarMassGrams.toFixed(3) + " г/моль");
          }
        } else {
          $("#error").text("Неожиданный формат ответа от сервера.");
          $("#result-molar-mass").text("Ошибка");
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error("AJAX Error (calculate_molar_mass):", textStatus, errorThrown);
        let errorMsg = "Ошибка связи с сервером при расчете M.";
        if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
          errorMsg += " " + jqXHR.responseJSON.message;
        }
        $("#error").text(errorMsg);
        $("#result-molar-mass").text("Ошибка");
      }
    });
  });

   $("#calculationForm input").on("input", function() {
     if ($("#result-molar-mass").text() !== "-") {
       $("#result-molar-mass").text("-");
       $("#error").text("Данные изменены. Нажмите 'Рассчитать' для обновления.");
       if (typeof window.resetAnimation === 'function') {
         window.resetAnimation();
       }
     }
   });
});
