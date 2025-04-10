$(document).ready(function () {
  let calculatedM2 = null;

  $("#simulationForm").on("submit", function (event) {
    event.preventDefault();

    $("#result-mass-m2").text("-");
    $("#result-molar-mass").text("-");
    $("#error").text("");
    $('#calculateMButton').hide();
    calculatedM2 = null;

    const gasId = $("#gasSelect").val();
    const M1 = $("#M1").val();
    const P1 = $("#P1").val();
    const P2 = $("#P2").val();
    const V = $("#V").val();
    const T = $("#T").val();

    if (!gasId || M1 === '' || P1 === '' || P2 === '' || V === '' || T === '') {
      $("#error").text("Этап 1: Пожалуйста, заполните все поля и выберите газ.");
      if (typeof window.resetAnimation === 'function') window.resetAnimation();
      return;
    }
     if (parseFloat(P2) <= parseFloat(P1)) {
      $("#error").text("Этап 1: Конечное давление (P2) должно быть больше начального (P1).");
       if (typeof window.resetAnimation === 'function') window.resetAnimation();
      return;
     }

    $.ajax({
      url: "/calculate_final_mass",
      type: "POST",
      data: {
        gasId: gasId,
        m1: M1,
        P1: P1,
        P2: P2,
        V: V,
        T: T
      },
      success: function(response) {
        if (response.message) {
          $("#error").text("Этап 1: " + response.message);
          $("#result-mass-m2").text("Ошибка");
           if (typeof window.resetAnimation === 'function') window.resetAnimation();
        } else if (response.final_mass_g !== undefined) {
          calculatedM2 = response.final_mass_g;
          const finalMassFormatted = calculatedM2.toFixed(3);
          $("#result-mass-m2").text(finalMassFormatted + " г");
          $('#calculateMButton').show();

          if (typeof window.startSimulationAnimation === 'function') {
            window.startSimulationAnimation({
              initialPressure: parseFloat(P1),
              finalPressure: parseFloat(P2),
              initialMass: parseFloat(M1),
              finalMass: calculatedM2
            });
          }
        } else {
           $("#error").text("Этап 1: Неожиданный ответ от сервера.");
           if (typeof window.resetAnimation === 'function') window.resetAnimation();
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error("AJAX Error (calculate_final_mass):", textStatus, errorThrown);
        let errorMsg = "Этап 1: Ошибка связи с сервером.";
        if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
          errorMsg += " " + jqXHR.responseJSON.message;
        }
        $("#error").text(errorMsg);
        $("#result-mass-m2").text("Ошибка");
         if (typeof window.resetAnimation === 'function') window.resetAnimation();
      }
    });
  });

  $("#calculateMButton").on("click", function() {
     $("#result-molar-mass").text("-");
     $("#error").text("");

    if (calculatedM2 === null) {
      $("#error").text("Этап 2: Сначала симулируйте накачку для получения m2.");
      return;
    }

    const m1_g = parseFloat($("#M1").val());
    const m2_g = calculatedM2;
    const P1_pa = parseFloat($("#P1").val());
    const P2_pa = parseFloat($("#P2").val());
    const V_m3 = parseFloat($("#V").val());
    const T_c = parseFloat($("#T").val());

    if (isNaN(m1_g) || isNaN(m2_g) || isNaN(P1_pa) || isNaN(P2_pa) || isNaN(V_m3) || isNaN(T_c)) {
      $("#error").text("Этап 2: Ошибка в исходных данных для расчета M.");
      return;
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
          $("#error").text("Этап 2: " + response.message);
          $("#result-molar-mass").text("Ошибка");
         } else if (response.molar_mass_kg_mol !== undefined) {
           const molarMassGrams = response.molar_mass_kg_mol * 1000.0;
           if (isNaN(molarMassGrams) || !isFinite(molarMassGrams) || molarMassGrams <= 0) {
             $("#error").text("Этап 2: Рассчитанное значение M некорректно.");
             $("#result-molar-mass").text("Ошибка");
           } else {
             $("#result-molar-mass").text(molarMassGrams.toFixed(3) + " г/моль");
           }
         } else {
           $("#error").text("Этап 2: Неожиданный ответ от сервера при расчете M.");
         }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error("AJAX Error (calculate_molar_mass):", textStatus, errorThrown);
        let errorMsg = "Этап 2: Ошибка связи с сервером при расчете M.";
        if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
          errorMsg += " " + jqXHR.responseJSON.message;
        }
        $("#error").text(errorMsg);
        $("#result-molar-mass").text("Ошибка");
      }
     });
  });

   $("#simulationForm input, #simulationForm select").on("change", function() {
     if (calculatedM2 !== null) {
       $("#result-mass-m2").text("-");
       $("#result-molar-mass").text("-");
       $("#error").text("Данные изменились. Пожалуйста, запустите симуляцию заново.");
       $('#calculateMButton').hide();
       calculatedM2 = null;
       if (typeof window.resetAnimation === 'function') {
         window.resetAnimation();
       }
     }
   });

});
