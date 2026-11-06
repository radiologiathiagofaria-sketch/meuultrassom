/**
 * MEUULTRASSOM — MÓDULO OBSTÉTRICO INICIAL (1º TRIMESTRE)
 * Lógica de Geração do Laudo Padrão Dinâmico
 * Base oficial: obstetrico inicial com embriao normal.docx
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. ESTADO COMPLETO DO EXAME
  // Todos os campos numéricos iniciam vazios (sem dados fictícios/exemplos)
  // =========================================================================
  const state = {
    cronologia: {
      dumStatus: 'sim', // 'sim' | 'incerta' | 'nao'
      dum: '',
      dumCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      exameAnt: 'nao', // 'nao' | 'sim'
      exameAntData: '',
      exameAntSem: '',
      exameAntDias: '',
      exameAntCalculada: { valid: false, semanas: 0, dias: 0 },
      viaExame: 'transvaginal', // 'transvaginal' | 'pelvica' | 'combinada'
      bexiga: 'vazia' // 'vazia' | 'repleta' | 'parcial'
    },
    utero: {
      posicao: 'em anteversão',
      d1: '',
      d2: '',
      d3: '',
      volume: null
    },
    sacoGestacional: {
      d1: '',
      d2: '',
      d3: '',
      medio: null,
      medioDireto: ''
    },
    hematoma: {
      presente: false,
      d1: '',
      d2: '',
      d3: '',
      obsPaciente: false
    },
    vesicula: {
      status: 'identificada', // 'identificada' | 'nao_identificada'
      medidaMm: ''
    },
    embriao: {
      identificado: true, // 'sim' (padrão) | 'nao'
      ccn: '',
      igCcn: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      bcfStatus: 'presentes', // 'presentes' | 'ausentes'
      bcf: ''
    },
    ovarioDireito: {
      estado: 'caracterizado', // 'caracterizado' | 'nao_caracterizado'
      temAchados: false, // true | false
      d1: '',
      d2: '',
      d3: '',
      volume: null,
      justificativa: 'interposicao',
      outraJustificativa: '',
      anexoHabitual: false,
      achados: {
        corpoLuteo: { ativo: false, conclusao: false },
        cistosFuncionais: { ativo: false, conclusao: false },
        foliculo: { ativo: false, conclusao: false },
        outro: { ativo: false, texto: '', conclusao: false }
      }
    },
    ovarioEsquerdo: {
      estado: 'caracterizado', // 'caracterizado' | 'nao_caracterizado'
      temAchados: false, // true | false
      d1: '',
      d2: '',
      d3: '',
      volume: null,
      justificativa: 'interposicao',
      outraJustificativa: '',
      anexoHabitual: false,
      achados: {
        corpoLuteo: { ativo: false, conclusao: false },
        cistosFuncionais: { ativo: false, conclusao: false },
        foliculo: { ativo: false, conclusao: false },
        outro: { ativo: false, texto: '', conclusao: false }
      }
    },
    fundoDouglas: 'livre', // 'livre' | 'pequena' | 'moderada' | 'acentuada'
    isManualEdit: false
  };

  // =========================================================================
  // 2. FUNÇÕES MATEMÁTICAS E FORMATAÇÃO BRASILEIRA
  // =========================================================================

  function getMidnightDate(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  function parseDateBR(dateStr) {
    if (!dateStr || dateStr.length !== 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (year < 1900 || year > 2100 || month < 0 || month > 11) return null;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (day < 1 || day > daysInMonth) return null;

    return new Date(year, month, day, 0, 0, 0, 0);
  }

  function formatDateBR(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function diffInDays(d1, d2) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((d2.getTime() - d1.getTime()) / msPerDay);
  }

  function formatNumBR(val) {
    if (val === null || val === undefined || val === '') return '';
    return String(val).replace('.', ',');
  }

  function applyDateMask(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 8) value = value.substring(0, 8);
      if (value.length > 4) {
        e.target.value = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4)}`;
      } else if (value.length > 2) {
        e.target.value = `${value.substring(0, 2)}/${value.substring(2)}`;
      } else {
        e.target.value = value;
      }
    });
  }

  /**
   * Cálculo de Idade Gestacional pela DUM (Regra de Naegele)
   */
  function calculateDum(dumStr) {
    const dumDate = parseDateBR(dumStr);
    if (!dumDate) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const today = getMidnightDate();
    const daysElapsed = diffInDays(dumDate, today);
    if (daysElapsed < 0 || daysElapsed > 300) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: daysElapsed };
    }
    const semanas = Math.floor(daysElapsed / 7);
    const dias = daysElapsed % 7;
    const dppDate = new Date(dumDate.getTime() + (280 * 24 * 60 * 60 * 1000));

    return {
      valid: true,
      semanas,
      dias,
      dpp: formatDateBR(dppDate),
      diasTotais: daysElapsed
    };
  }

  /**
   * Cálculo de Idade Gestacional pelo CCN (Fórmula de Robinson & Fleming)
   * totalDias = round(8.052 * sqrt(ccn * 1.037) + 23.73)
   */
  function calculateCcn(ccnVal) {
    const ccn = parseFloat(String(ccnVal).replace(',', '.'));
    if (isNaN(ccn) || ccn < 1 || ccn > 90) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const totalDias = Math.round(8.052 * Math.sqrt(ccn * 1.037) + 23.73);
    const semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;

    const today = getMidnightDate();
    const daysRemaining = 280 - totalDias;
    const dppDate = new Date(today.getTime() + (daysRemaining * 24 * 60 * 60 * 1000));

    return {
      valid: true,
      semanas,
      dias,
      dpp: formatDateBR(dppDate),
      diasTotais: totalDias
    };
  }

  /**
   * Cálculo do volume uterino ou ovariano: D1 * D2 * D3 * 0.523
   */
  function calculateVolume(d1, d2, d3) {
    const v1 = parseFloat(String(d1).replace(',', '.'));
    const v2 = parseFloat(String(d2).replace(',', '.'));
    const v3 = parseFloat(String(d3).replace(',', '.'));
    if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3) && v1 > 0 && v2 > 0 && v3 > 0) {
      const vol = v1 * v2 * v3 * 0.523;
      return vol >= 100 ? vol.toFixed(0) : vol.toFixed(1);
    }
    return null;
  }

  /**
   * Diâmetro médio do saco gestacional: (D1 + D2 + D3) / 3
   */
  function calculateMeanDiameter(d1, d2, d3) {
    const v1 = parseFloat(String(d1).replace(',', '.'));
    const v2 = parseFloat(String(d2).replace(',', '.'));
    const v3 = parseFloat(String(d3).replace(',', '.'));
    if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3) && v1 > 0 && v2 > 0 && v3 > 0) {
      return ((v1 + v2 + v3) / 3).toFixed(1);
    }
    return null;
  }

  // =========================================================================
  // 3. REFERÊNCIAS DO DOM
  // =========================================================================
  const dom = {
    // Header & Theme
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIconSun: document.getElementById('themeIconSun'),
    themeIconMoon: document.getElementById('themeIconMoon'),

    // Cronologia
    selDumStatus: document.getElementById('selDumStatus'),
    groupDumData: document.getElementById('groupDumData'),
    inputDum: document.getElementById('inputDum'),
    dumFeedbackBox: document.getElementById('dumFeedbackBox'),
    dumIgDisplay: document.getElementById('dumIgDisplay'),
    selExameAnt: document.getElementById('selExameAnt'),
    panelExameAnt: document.getElementById('panelExameAnt'),
    inputExameAntData: document.getElementById('inputExameAntData'),
    inputExameAntSem: document.getElementById('inputExameAntSem'),
    inputExameAntDias: document.getElementById('inputExameAntDias'),
    exameAntCalcDisplay: document.getElementById('exameAntCalcDisplay'),
    exameAntIgText: document.getElementById('exameAntIgText'),
    selViaExame: document.getElementById('selViaExame'),
    selBexiga: document.getElementById('selBexiga'),

    // Útero e SG
    selPosicaoUtero: document.getElementById('selPosicaoUtero'),
    uteroD1: document.getElementById('uteroD1'),
    uteroD2: document.getElementById('uteroD2'),
    uteroD3: document.getElementById('uteroD3'),
    uteroVolText: document.getElementById('uteroVolText'),
    sgD1: document.getElementById('sgD1'),
    sgD2: document.getElementById('sgD2'),
    sgD3: document.getElementById('sgD3'),
    sgMedioText: document.getElementById('sgMedioText'),
    sgMedioInput: document.getElementById('sgMedioInput'),

    // Hematoma
    btnHematomaNao: document.getElementById('btnHematomaNao'),
    btnHematomaSim: document.getElementById('btnHematomaSim'),
    panelHematoma: document.getElementById('panelHematoma'),
    hemD1: document.getElementById('hemD1'),
    hemD2: document.getElementById('hemD2'),
    hemD3: document.getElementById('hemD3'),
    chkHematomaObs: document.getElementById('chkHematomaObs'),

    // Vesícula & Embrião
    selVesicula: document.getElementById('selVesicula'),
    groupVesiculaMedida: document.getElementById('groupVesiculaMedida'),
    inputVesiculaMm: document.getElementById('inputVesiculaMm'),
    btnEmbIdentificado: document.getElementById('btnEmbIdentificado'),
    btnEmbNaoIdentificado: document.getElementById('btnEmbNaoIdentificado'),
    panelEmbriao: document.getElementById('panelEmbriao'),
    inputCcn: document.getElementById('inputCcn'),
    selBcfStatus: document.getElementById('selBcfStatus'),
    groupBcfValor: document.getElementById('groupBcfValor'),
    inputBcf: document.getElementById('inputBcf'),
    ccnCalcDisplay: document.getElementById('ccnCalcDisplay'),
    ccnIgText: document.getElementById('ccnIgText'),

    // Ovário Direito
    selOdEstado: document.getElementById('selOdEstado'),
    panelOdCaracterizado: document.getElementById('panelOdCaracterizado'),
    odD1: document.getElementById('odD1'),
    odD2: document.getElementById('odD2'),
    odD3: document.getElementById('odD3'),
    odVolText: document.getElementById('odVolText'),
    panelOdNaoCaract: document.getElementById('panelOdNaoCaract'),
    selOdJustificativa: document.getElementById('selOdJustificativa'),
    groupOdOutraJust: document.getElementById('groupOdOutraJust'),
    inputOdOutraJust: document.getElementById('inputOdOutraJust'),
    chkOdAnexoHabitual: document.getElementById('chkOdAnexoHabitual'),
    btnOdAchadosNao: document.getElementById('btnOdAchadosNao'),
    btnOdAchadosSim: document.getElementById('btnOdAchadosSim'),
    panelOdAchados: document.getElementById('panelOdAchados'),
    chkOdCorpoLuteo: document.getElementById('chkOdCorpoLuteo'),
    groupOdCorpoLuteo: document.getElementById('groupOdCorpoLuteo'),
    btnOdClConclNao: document.getElementById('btnOdClConclNao'),
    btnOdClConclSim: document.getElementById('btnOdClConclSim'),
    chkOdCistosFuncionais: document.getElementById('chkOdCistosFuncionais'),
    groupOdCistosFuncionais: document.getElementById('groupOdCistosFuncionais'),
    btnOdCfConclNao: document.getElementById('btnOdCfConclNao'),
    btnOdCfConclSim: document.getElementById('btnOdCfConclSim'),
    chkOdFoliculo: document.getElementById('chkOdFoliculo'),
    groupOdFoliculo: document.getElementById('groupOdFoliculo'),
    btnOdFolConclNao: document.getElementById('btnOdFolConclNao'),
    btnOdFolConclSim: document.getElementById('btnOdFolConclSim'),
    chkOdOutro: document.getElementById('chkOdOutro'),
    groupOdOutro: document.getElementById('groupOdOutro'),
    odOutroTexto: document.getElementById('odOutroTexto'),
    btnOdOutroConclNao: document.getElementById('btnOdOutroConclNao'),
    btnOdOutroConclSim: document.getElementById('btnOdOutroConclSim'),

    // Ovário Esquerdo
    selOeEstado: document.getElementById('selOeEstado'),
    panelOeCaracterizado: document.getElementById('panelOeCaracterizado'),
    oeD1: document.getElementById('oeD1'),
    oeD2: document.getElementById('oeD2'),
    oeD3: document.getElementById('oeD3'),
    oeVolText: document.getElementById('oeVolText'),
    panelOeNaoCaract: document.getElementById('panelOeNaoCaract'),
    selOeJustificativa: document.getElementById('selOeJustificativa'),
    groupOeOutraJust: document.getElementById('groupOeOutraJust'),
    inputOeOutraJust: document.getElementById('inputOeOutraJust'),
    chkOeAnexoHabitual: document.getElementById('chkOeAnexoHabitual'),
    btnOeAchadosNao: document.getElementById('btnOeAchadosNao'),
    btnOeAchadosSim: document.getElementById('btnOeAchadosSim'),
    panelOeAchados: document.getElementById('panelOeAchados'),
    chkOeCorpoLuteo: document.getElementById('chkOeCorpoLuteo'),
    groupOeCorpoLuteo: document.getElementById('groupOeCorpoLuteo'),
    btnOeClConclNao: document.getElementById('btnOeClConclNao'),
    btnOeClConclSim: document.getElementById('btnOeClConclSim'),
    chkOeCistosFuncionais: document.getElementById('chkOeCistosFuncionais'),
    groupOeCistosFuncionais: document.getElementById('groupOeCistosFuncionais'),
    btnOeCfConclNao: document.getElementById('btnOeCfConclNao'),
    btnOeCfConclSim: document.getElementById('btnOeCfConclSim'),
    chkOeFoliculo: document.getElementById('chkOeFoliculo'),
    groupOeFoliculo: document.getElementById('groupOeFoliculo'),
    btnOeFolConclNao: document.getElementById('btnOeFolConclNao'),
    btnOeFolConclSim: document.getElementById('btnOeFolConclSim'),
    chkOeOutro: document.getElementById('chkOeOutro'),
    groupOeOutro: document.getElementById('groupOeOutro'),
    oeOutroTexto: document.getElementById('oeOutroTexto'),
    btnOeOutroConclNao: document.getElementById('btnOeOutroConclNao'),
    btnOeOutroConclSim: document.getElementById('btnOeOutroConclSim'),

    // Fundo de Saco de Douglas
    selDouglas: document.getElementById('selDouglas'),

    // Toolbar & Laudo
    btnNovoExame: document.getElementById('btnNovoExame'),
    btnImprimir: document.getElementById('btnImprimir'),
    btnCopiarLaudo: document.getElementById('btnCopiarLaudo'),
    btnRestaurarLaudo: document.getElementById('btnRestaurarLaudo'),
    manualEditBadge: document.getElementById('manualEditBadge'),
    reportPaper: document.getElementById('reportPaper'),

    // Modal & Toast
    modalNovoExame: document.getElementById('modalNovoExame'),
    btnModalCancel: document.getElementById('btnModalCancel'),
    btnModalConfirm: document.getElementById('btnModalConfirm'),
    toastNotice: document.getElementById('toastNotice'),
    toastMessage: document.getElementById('toastMessage')
  };

  // =========================================================================
  // 4. ATUALIZAÇÃO DOS CÁLCULOS E DO FORMULÁRIO
  // =========================================================================

  function updateCalculations() {
    // 1. DUM
    if (state.cronologia.dumStatus === 'sim' && state.cronologia.dum) {
      state.cronologia.dumCalculada = calculateDum(state.cronologia.dum);
      if (state.cronologia.dumCalculada.valid) {
        dom.dumFeedbackBox.style.display = 'flex';
        dom.dumIgDisplay.textContent = `${state.cronologia.dumCalculada.semanas} semanas e ${state.cronologia.dumCalculada.dias} dias (DPP: ${state.cronologia.dumCalculada.dpp})`;
      } else {
        dom.dumFeedbackBox.style.display = 'none';
      }
    } else {
      state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
      dom.dumFeedbackBox.style.display = 'none';
    }

    // 2. Exame anterior
    if (state.cronologia.exameAnt === 'sim' && state.cronologia.exameAntData && state.cronologia.exameAntSem) {
      const prevDate = parseDateBR(state.cronologia.exameAntData);
      const prevSem = parseInt(state.cronologia.exameAntSem, 10);
      const prevDias = parseInt(state.cronologia.exameAntDias || '0', 10);
      if (prevDate && !isNaN(prevSem)) {
        const today = getMidnightDate();
        const diff = diffInDays(prevDate, today);
        if (diff >= 0) {
          const totalDaysNow = (prevSem * 7) + prevDias + diff;
          const semNow = Math.floor(totalDaysNow / 7);
          const diasNow = totalDaysNow % 7;
          state.cronologia.exameAntCalculada = { valid: true, semanas: semNow, dias: diasNow };
          dom.exameAntCalcDisplay.style.display = 'flex';
          dom.exameAntIgText.textContent = `${semNow} semanas e ${diasNow} dias`;
        } else {
          dom.exameAntCalcDisplay.style.display = 'none';
        }
      } else {
        dom.exameAntCalcDisplay.style.display = 'none';
      }
    } else {
      dom.exameAntCalcDisplay.style.display = 'none';
    }

    // 3. Útero Volume
    state.utero.volume = calculateVolume(state.utero.d1, state.utero.d2, state.utero.d3);
    dom.uteroVolText.textContent = state.utero.volume ? `${formatNumBR(state.utero.volume)} cm³` : 'x cm³';

    // 4. Saco Gestacional Diâmetro Médio (Cálculo ou Inserção Direta)
    const calcMedio = calculateMeanDiameter(state.sacoGestacional.d1, state.sacoGestacional.d2, state.sacoGestacional.d3);
    if (calcMedio) {
      state.sacoGestacional.medio = calcMedio;
      if (dom.sgMedioText) dom.sgMedioText.textContent = `${formatNumBR(calcMedio)} mm`;
    } else if (state.sacoGestacional.medioDireto) {
      state.sacoGestacional.medio = state.sacoGestacional.medioDireto;
      if (dom.sgMedioText) dom.sgMedioText.textContent = `${formatNumBR(state.sacoGestacional.medioDireto)} mm`;
    } else {
      state.sacoGestacional.medio = null;
      if (dom.sgMedioText) dom.sgMedioText.textContent = 'x mm';
    }

    // 5. Embrião CCN e IG
    if (state.embriao.identificado && state.embriao.ccn) {
      state.embriao.igCcn = calculateCcn(state.embriao.ccn);
      if (state.embriao.igCcn.valid) {
        dom.ccnCalcDisplay.style.display = 'flex';
        dom.ccnIgText.textContent = `${state.embriao.igCcn.semanas} semanas e ${state.embriao.igCcn.dias} dias (±5 dias) — DPP: ${state.embriao.igCcn.dpp}`;
      } else {
        dom.ccnCalcDisplay.style.display = 'none';
      }
    } else {
      state.embriao.igCcn = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
      dom.ccnCalcDisplay.style.display = 'none';
    }

    // 6. Ovário Direito Volume
    if (state.ovarioDireito.estado === 'caracterizado') {
      state.ovarioDireito.volume = calculateVolume(state.ovarioDireito.d1, state.ovarioDireito.d2, state.ovarioDireito.d3);
      if (dom.odVolText) dom.odVolText.textContent = state.ovarioDireito.volume ? `${formatNumBR(state.ovarioDireito.volume)} cm³` : 'x cm³';
    } else {
      state.ovarioDireito.volume = null;
    }

    // 7. Ovário Esquerdo Volume
    if (state.ovarioEsquerdo.estado === 'caracterizado') {
      state.ovarioEsquerdo.volume = calculateVolume(state.ovarioEsquerdo.d1, state.ovarioEsquerdo.d2, state.ovarioEsquerdo.d3);
      if (dom.oeVolText) dom.oeVolText.textContent = state.ovarioEsquerdo.volume ? `${formatNumBR(state.ovarioEsquerdo.volume)} cm³` : 'x cm³';
    } else {
      state.ovarioEsquerdo.volume = null;
    }

    // Atualiza a pré-visualização do laudo (somente se o médico não estiver em edição manual)
    if (!state.isManualEdit) {
      renderReportText();
    }
  }

  // =========================================================================
  // 5. CONSTRUTOR FIEL DO LAUDO PADRÃO DINÂMICO
  // Referência oficial: obstetrico inicial com embriao normal.docx
  // =========================================================================

  function renderReportText() {
    if (!dom.reportPaper) return;

    const p = [];

    // 1. TÍTULO PRINCIPAL (CENTRALIZADO, EM NEGRITO)
    p.push(`<p class="report-title"><b>ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE</b></p>`);
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 2. CRONOLOGIA GESTACIONAL
    if (state.cronologia.dumStatus === 'sim') {
      const dumText = state.cronologia.dum ? state.cronologia.dum : 'x';
      p.push(`<p>Data da última menstruação: ${dumText}.</p>`);

      if (state.cronologia.dumCalculada.valid) {
        p.push(`<p>Exame ultrassonográfico realizado com ${state.cronologia.dumCalculada.semanas} semanas e ${state.cronologia.dumCalculada.dias} dias de idade gestacional segundo a data da última menstruação.</p>`);
      } else {
        p.push(`<p>Exame ultrassonográfico realizado com x semanas e x dias de idade gestacional segundo a data da última menstruação.</p>`);
      }
    } else if (state.cronologia.dumStatus === 'incerta') {
      p.push(`<p>Data da última menstruação: incerta.</p>`);
    }

    // Técnica
    const viaTexto = state.cronologia.viaExame === 'pelvica' 
      ? 'pélvica' 
      : state.cronologia.viaExame === 'combinada'
        ? 'vias combinadas (transabdominal e transvaginal)'
        : 'transvaginal';
    p.push(`<p>Exame realizado pela via ${viaTexto}.</p>`);

    const bexigaTexto = state.cronologia.bexiga === 'repleta'
      ? 'Bexiga repleta.'
      : state.cronologia.bexiga === 'parcial'
        ? 'Bexiga com repleção parcial.'
        : 'Bexiga vazia.';
    p.push(`<p>${bexigaTexto}</p>`);

    // 3. ÚTERO
    p.push(`<p class="report-blank-line">&nbsp;</p>`);
    p.push(`<p class="report-section-title"><b>ÚTERO</b></p>`);
    p.push(`<p>Útero centralizado, ${state.utero.posicao}. A forma é globosa e de volume aumentado, compatível com o período gestacional.</p>`);

    const utD1 = state.utero.d1 ? formatNumBR(state.utero.d1) : 'a';
    const utD2 = state.utero.d2 ? formatNumBR(state.utero.d2) : 'b';
    const utD3 = state.utero.d3 ? formatNumBR(state.utero.d3) : 'c';
    const utVol = state.utero.volume ? formatNumBR(state.utero.volume) : 'x';
    p.push(`<p>O útero mede ${utD1} x ${utD2} x ${utD3} cm (volume = ${utVol} cm³).</p>`);

    // 4. SACO GESTACIONAL (Cálculo ou inserção direta do Diâmetro Médio)
    p.push(`<p class="report-blank-line">&nbsp;</p>`);
    const sgMedioVal = state.sacoGestacional.medio ? formatNumBR(state.sacoGestacional.medio) : 'x';
    p.push(`<p>Detecta-se presença de saco gestacional tópico, em região fúndica, de limites regulares no seu interior, cujo diâmetro médio foi ${sgMedioVal} mm.</p>`);

    // 5. HEMATOMA SUBCORIÔNICO (SE PRESENTE, LOGO APÓS SACO GESTACIONAL)
    if (state.hematoma.presente) {
      p.push(`<p class="report-blank-line">&nbsp;</p>`);
      const h1 = state.hematoma.d1 ? formatNumBR(state.hematoma.d1) : 'a';
      const h2 = state.hematoma.d2 ? formatNumBR(state.hematoma.d2) : 'b';
      const h3 = state.hematoma.d3 ? formatNumBR(state.hematoma.d3) : 'c';
      p.push(`<p>Nota-se área hipoecogênica adjacente ao saco gestacional medindo ${h1} x ${h2} x ${h3} mm, sugestiva de hematoma subcoriônico.</p>`);
    }

    // 6. VESÍCULA VITELÍNICA E EMBRIÃO
    p.push(`<p class="report-blank-line">&nbsp;</p>`);
    if (state.embriao.identificado) {
      // EMBRIÃO IDENTIFICADO (Modelo Padrão)
      p.push(`<p class="report-section-title"><b>EMBRIÃO</b></p>`);
      const ccnVal = state.embriao.ccn ? formatNumBR(state.embriao.ccn) : 'x';
      p.push(`<p>Individualizado com CCN de ${ccnVal} mm.</p>`);

      // Batimentos cardíacos
      if (state.embriao.bcfStatus === 'presentes') {
        const bcfVal = state.embriao.bcf ? state.embriao.bcf : 'x';
        p.push(`<p>Batimentos cardíacos presentes (${bcfVal} bpm)</p>`);
      } else {
        p.push(`<p>Batimentos cardíacos embrionários não identificados.</p>`);
      }

      // Vesícula Vitelínica
      if (state.vesicula.status === 'identificada') {
        const vvVal = state.vesicula.medidaMm ? formatNumBR(state.vesicula.medidaMm) : 'x';
        p.push(`<p>Vesícula vitelínica com aspecto regular, medindo ${vvVal} mm.</p>`);
      } else {
        p.push(`<p>Vesícula vitelínica não identificada.</p>`);
      }
    } else {
      // EMBRIÃO NÃO IDENTIFICADO (Referência: obstetrico inicial com embriao nao identificado.docx)
      // Conforme o modelo da clínica, o título "EMBRIÃO" é suprimido
      if (state.vesicula.status === 'identificada') {
        const vvVal = state.vesicula.medidaMm ? formatNumBR(state.vesicula.medidaMm) : 'x';
        p.push(`<p>Vesícula vitelínica com aspecto regular, medindo ${vvVal} mm.</p>`);
      } else {
        p.push(`<p>Vesícula vitelínica não identificada.</p>`);
      }
      p.push(`<p>Embrião não identificado.</p>`);
    }

    // 7. OVÁRIOS
    p.push(`<p class="report-blank-line">&nbsp;</p>`);
    p.push(`<p class="report-section-title"><b>OVÁRIOS</b></p>`);

    // Ovário Direito — sem linha em branco entre título OVÁRIOS e subtítulo
    p.push(`<p class="report-subhead report-subhead-first"><b>Ovário Direito</b></p>`);
    if (state.ovarioDireito.estado === 'caracterizado') {
      const hasD1 = Boolean(state.ovarioDireito.d1);
      const hasD2 = Boolean(state.ovarioDireito.d2);
      const hasD3 = Boolean(state.ovarioDireito.d3);
      const allEmpty = !hasD1 && !hasD2 && !hasD3;

      let medDesc = '';
      if (allEmpty) {
        medDesc = 'Identificado em projeção parauterina, de dimensões normais.';
      } else {
        const d1 = hasD1 ? formatNumBR(state.ovarioDireito.d1) : 'a';
        const d2 = hasD2 ? formatNumBR(state.ovarioDireito.d2) : 'b';
        const d3 = hasD3 ? formatNumBR(state.ovarioDireito.d3) : 'c';
        const vol = state.ovarioDireito.volume ? formatNumBR(state.ovarioDireito.volume) : 'x';
        medDesc = `Identificado em projeção parauterina, medindo ${d1} x ${d2} x ${d3} cm (volume: ${vol} cm³).`;
      }

      // Achados variáveis (se habilitados)
      const achadosTxt = [];
      if (state.ovarioDireito.temAchados) {
        const odAch = state.ovarioDireito.achados;
        if (odAch.corpoLuteo.ativo) {
          achadosTxt.push('Formação cística com paredes espessadas e halo vascularizado sugestiva de corpo lúteo.');
        }
        if (odAch.cistosFuncionais.ativo) {
          achadosTxt.push('Formações císticas anecóides, de paredes finas e lisas, sugerindo cistos funcionais.');
        }
        if (odAch.foliculo.ativo) {
          achadosTxt.push('Formação cística anecóide, de paredes finas e lisas, sugerindo folículo dominante.');
        }
        if (odAch.outro.ativo && odAch.outro.texto) {
          achadosTxt.push(odAch.outro.texto);
        }
      }

      if (allEmpty) {
        p.push('<p>Identificado em projeção parauterina, de dimensões normais. Ecotextura ovariana característica. Seu contorno e sua forma são habituais.</p>');
      } else {
        p.push(`<p>${medDesc}</p>`);
        p.push('<p>Ecotextura ovariana característica. Seu contorno e sua forma são habituais.</p>');
      }

      if (achadosTxt.length > 0) {
        achadosTxt.forEach(txt => p.push(`<p>${txt}</p>`));
      }
    } else {
      // Não caracterizado
      let justText = '';
      if (state.ovarioDireito.justificativa === 'interposicao') {
        justText = ' devido à interposição de alças intestinais.';
      } else if (state.ovarioDireito.justificativa === 'limitacao') {
        justText = ' devido a limitações técnicas.';
      } else if (state.ovarioDireito.justificativa === 'outra') {
        justText = state.ovarioDireito.outraJustificativa ? ` devido a ${state.ovarioDireito.outraJustificativa}.` : '.';
      } else {
        justText = '.';
      }
      p.push(`<p>Não caracterizado no presente estudo${justText}</p>`);
      if (state.ovarioDireito.anexoHabitual) {
        p.push('<p>A região anexial direita apresenta aspecto habitual.</p>');
      }
      if (state.ovarioDireito.temAchados) {
        const odAch = state.ovarioDireito.achados;
        if (odAch.corpoLuteo.ativo) {
          p.push('<p>Formação cística com paredes espessadas e halo vascularizado sugestiva de corpo lúteo.</p>');
        }
        if (odAch.cistosFuncionais.ativo) {
          p.push('<p>Formações císticas anecóides, de paredes finas e lisas, sugerindo cistos funcionais.</p>');
        }
        if (odAch.foliculo.ativo) {
          p.push('<p>Formação cística anecóide, de paredes finas e lisas, sugerindo folículo dominante.</p>');
        }
        if (odAch.outro.ativo && odAch.outro.texto) {
          p.push(`<p>${odAch.outro.texto}</p>`);
        }
      }
    }

    // Ovário Esquerdo
    p.push(`<p class="report-blank-line">&nbsp;</p>`);
    p.push(`<p class="report-subhead"><b>Ovário Esquerdo</b></p>`);
    if (state.ovarioEsquerdo.estado === 'caracterizado') {
      const hasD1 = Boolean(state.ovarioEsquerdo.d1);
      const hasD2 = Boolean(state.ovarioEsquerdo.d2);
      const hasD3 = Boolean(state.ovarioEsquerdo.d3);
      const allEmpty = !hasD1 && !hasD2 && !hasD3;

      let medDesc = '';
      if (allEmpty) {
        medDesc = 'Identificado em projeção parauterina, de dimensões normais.';
      } else {
        const d1 = hasD1 ? formatNumBR(state.ovarioEsquerdo.d1) : 'a';
        const d2 = hasD2 ? formatNumBR(state.ovarioEsquerdo.d2) : 'b';
        const d3 = hasD3 ? formatNumBR(state.ovarioEsquerdo.d3) : 'c';
        const vol = state.ovarioEsquerdo.volume ? formatNumBR(state.ovarioEsquerdo.volume) : 'x';
        medDesc = `Identificado em projeção parauterina, medindo ${d1} x ${d2} x ${d3} cm (volume: ${vol} cm³).`;
      }

      // Achados variáveis (se habilitados)
      const achadosTxt = [];
      if (state.ovarioEsquerdo.temAchados) {
        const oeAch = state.ovarioEsquerdo.achados;
        if (oeAch.corpoLuteo.ativo) {
          achadosTxt.push('Formação cística com paredes espessadas e halo vascularizado sugestiva de corpo lúteo.');
        }
        if (oeAch.cistosFuncionais.ativo) {
          achadosTxt.push('Formações císticas anecóides, de paredes finas e lisas, sugerindo cistos funcionais.');
        }
        if (oeAch.foliculo.ativo) {
          achadosTxt.push('Formação cística anecóide, de paredes finas e lisas, sugerindo folículo dominante.');
        }
        if (oeAch.outro.ativo && oeAch.outro.texto) {
          achadosTxt.push(oeAch.outro.texto);
        }
      }

      if (allEmpty) {
        p.push('<p>Identificado em projeção parauterina, de dimensões normais. Ecotextura ovariana característica. Seu contorno e sua forma são habituais.</p>');
      } else {
        p.push(`<p>${medDesc}</p>`);
        p.push('<p>Ecotextura ovariana característica. Seu contorno e sua forma são habituais.</p>');
      }

      if (achadosTxt.length > 0) {
        achadosTxt.forEach(txt => p.push(`<p>${txt}</p>`));
      }
    } else {
      // Não caracterizado
      let justText = '';
      if (state.ovarioEsquerdo.justificativa === 'interposicao') {
        justText = ' devido à interposição de alças intestinais.';
      } else if (state.ovarioEsquerdo.justificativa === 'limitacao') {
        justText = ' devido a limitações técnicas.';
      } else if (state.ovarioEsquerdo.justificativa === 'outra') {
        justText = state.ovarioEsquerdo.outraJustificativa ? ` devido a ${state.ovarioEsquerdo.outraJustificativa}.` : '.';
      } else {
        justText = '.';
      }
      p.push(`<p>Não caracterizado no presente estudo${justText}</p>`);
      if (state.ovarioEsquerdo.anexoHabitual) {
        p.push('<p>A região anexial esquerda apresenta aspecto habitual.</p>');
      }
      if (state.ovarioEsquerdo.temAchados) {
        const oeAch = state.ovarioEsquerdo.achados;
        if (oeAch.corpoLuteo.ativo) {
          p.push('<p>Formação cística com paredes espessadas e halo vascularizado sugestiva de corpo lúteo.</p>');
        }
        if (oeAch.cistosFuncionais.ativo) {
          p.push('<p>Formações císticas anecóides, de paredes finas e lisas, sugerindo cistos funcionais.</p>');
        }
        if (oeAch.foliculo.ativo) {
          p.push('<p>Formação cística anecóide, de paredes finas e lisas, sugerindo folículo dominante.</p>');
        }
        if (oeAch.outro.ativo && oeAch.outro.texto) {
          p.push(`<p>${oeAch.outro.texto}</p>`);
        }
      }
    }

    // 8. FUNDO DE SACO DE DOUGLAS (Opções ampliadas de líquido livre)
    p.push(`<p class="report-blank-line">&nbsp;</p>`);
    if (state.fundoDouglas === 'pequena') {
      p.push(`<p>Pequena quantidade de líquido em fundo de saco de Douglas.</p>`);
    } else if (state.fundoDouglas === 'moderada') {
      p.push(`<p>Moderada quantidade de líquido em fundo de saco de Douglas.</p>`);
    } else if (state.fundoDouglas === 'acentuada') {
      p.push(`<p>Acentuada quantidade de líquido em fundo de saco de Douglas.</p>`);
    } else {
      p.push(`<p>Fundo de Saco de Douglas livre.</p>`);
    }

    // 9. CONCLUSÃO DINÂMICA
    p.push(`<p class="report-blank-line">&nbsp;</p>`);
    p.push(`<p class="report-section-title"><b>CONCLUSÃO</b></p>`);

    // Flag para posicionar a frase de controle ultrassonográfico estritamente no final da conclusão
    let precisaControle = false;

    if (state.embriao.identificado) {
      // -----------------------------------------------------------------------
      // IDADE GESTACIONAL NA CONCLUSÃO: SOMENTE com CCN válido!
      // Inicia vazia (sem valores de exemplo, sem estimativa fictícia, sem DUM).
      // -----------------------------------------------------------------------
      const temCcn = state.embriao.igCcn.valid;
      const temDum = state.cronologia.dumCalculada.valid;

      const igSufixo = temCcn
        ? `, compatível com ${state.embriao.igCcn.semanas} semanas e ${state.embriao.igCcn.dias} dias (±5 dias)`
        : '';

      // -----------------------------------------------------------------------
      // DPP: lógica independente — regra dos 5 dias (DUM vs CCN)
      // Não apresentar DPP com dados zerados/incompletos.
      // -----------------------------------------------------------------------
      let dppText   = '';
      let dppOrigem = '';

      if (temCcn && temDum) {
        const difDias = Math.abs(state.embriao.igCcn.diasTotais - state.cronologia.dumCalculada.diasTotais);
        if (difDias <= 5) {
          dppText   = state.cronologia.dumCalculada.dpp;
          dppOrigem = ' (pela DUM)';
        } else {
          dppText   = state.embriao.igCcn.dpp;
          dppOrigem = ' (pela ultrassonografia atual)';
        }
      } else if (temCcn) {
        dppText   = state.embriao.igCcn.dpp;
        dppOrigem = ' (pela ultrassonografia atual)';
      } else if (temDum) {
        dppText   = state.cronologia.dumCalculada.dpp;
        dppOrigem = ' (pela DUM)';
      }

      if (state.embriao.bcfStatus === 'presentes') {
        // EMBRIÃO VIVO (Modelo Padrão)
        p.push(`<p>- Gestação tópica, com embrião único, vivo${igSufixo}.</p>`);
        if (dppText) {
          p.push(`<p>- Data provável do parto (DPP): ${dppText}${dppOrigem}.</p>`);
        }
      } else {
        // EMBRIÃO SEM BATIMENTOS (Referência: obstetrico inicial com embriao sem batimentos.docx)
        // 1. Descrição dos batimentos não identificados
        p.push(`<p>- Gestação tópica, com embrião único${igSufixo}.</p>`);
        p.push(`<p>- Batimentos cardíacos embrionários não identificados.</p>`);
        precisaControle = true;
      }

      // 2. Conclusão Hematoma (se presente, vem antes da frase de controle!)
      if (state.hematoma.presente) {
        const h1 = state.hematoma.d1 ? formatNumBR(state.hematoma.d1) : 'a';
        const h2 = state.hematoma.d2 ? formatNumBR(state.hematoma.d2) : 'b';
        const h3 = state.hematoma.d3 ? formatNumBR(state.hematoma.d3) : 'c';
        p.push(`<p>- Nota-se área hipoecogênica adjacente ao saco gestacional medindo ${h1} x ${h2} x ${h3} mm, sugestiva de hematoma subcoriônico.</p>`);
      }

    } else {
      // EMBRIÃO NÃO IDENTIFICADO (Referência: obstetrico inicial com embriao nao identificado.docx)
      p.push(`<p>- Gestação tópica inicial.</p>`);
      p.push(`<p>- Embrião não identificado.</p>`);
      precisaControle = true;

      if (state.hematoma.presente) {
        const h1 = state.hematoma.d1 ? formatNumBR(state.hematoma.d1) : 'a';
        const h2 = state.hematoma.d2 ? formatNumBR(state.hematoma.d2) : 'b';
        const h3 = state.hematoma.d3 ? formatNumBR(state.hematoma.d3) : 'c';
        p.push(`<p>- Nota-se área hipoecogênica adjacente ao saco gestacional medindo ${h1} x ${h2} x ${h3} mm, sugestiva de hematoma subcoriônico.</p>`);
      }
    }

    // Achados ovarianos na conclusão quando marcados individualmente com 'conclusao: true'
    // Ovário Direito
    if (state.ovarioDireito.temAchados) {
      const odAch = state.ovarioDireito.achados;
      if (odAch.corpoLuteo.ativo && odAch.corpoLuteo.conclusao) {
        p.push('<p>- Corpo lúteo no ovário direito.</p>');
      }
      if (odAch.cistosFuncionais.ativo && odAch.cistosFuncionais.conclusao) {
        p.push('<p>- Cistos funcionais no ovário direito.</p>');
      }
      if (odAch.foliculo.ativo && odAch.foliculo.conclusao) {
        p.push('<p>- Folículo dominante no ovário direito.</p>');
      }
      if (odAch.outro.ativo && odAch.outro.conclusao && odAch.outro.texto) {
        p.push(`<p>- Achado no ovário direito: ${odAch.outro.texto}.</p>`);
      }
    }

    // Ovário Esquerdo
    if (state.ovarioEsquerdo.temAchados) {
      const oeAch = state.ovarioEsquerdo.achados;
      if (oeAch.corpoLuteo.ativo && oeAch.corpoLuteo.conclusao) {
        p.push('<p>- Corpo lúteo no ovário esquerdo.</p>');
      }
      if (oeAch.cistosFuncionais.ativo && oeAch.cistosFuncionais.conclusao) {
        p.push('<p>- Cistos funcionais no ovário esquerdo.</p>');
      }
      if (oeAch.foliculo.ativo && oeAch.foliculo.conclusao) {
        p.push('<p>- Folículo dominante no ovário esquerdo.</p>');
      }
      if (oeAch.outro.ativo && oeAch.outro.conclusao && oeAch.outro.texto) {
        p.push(`<p>- Achado no ovário esquerdo: ${oeAch.outro.texto}.</p>`);
      }
    }

    // 3. Frase de controle ultrassonográfico SEMPRE como o último texto da conclusão
    if (precisaControle) {
      p.push(`<p class="report-blank-line">&nbsp;</p>`);
      p.push(`<p>Sugiro, a critério médico, controle ultrassonográfico.</p>`);
    }

    // 10. OBSERVAÇÃO FINAL (QUANDO HEMATOMA PRESENTE E OPÇÃO MARCADA)
    if (state.hematoma.presente && state.hematoma.obsPaciente) {
      p.push(`<p class="report-blank-line">&nbsp;</p>`);
      p.push(`<p class="report-blank-line">&nbsp;</p>`);
      p.push(`<p class="report-obs"><b>Observação:</b> paciente orientada quanto ao achado de hematoma subcoriônico, cuidados pertinentes, sinais de alarme e necessidade de avaliação pelo médico assistente ou atendimento médico em caso de intercorrências.</p>`);
    }

    dom.reportPaper.innerHTML = p.join('\n');
  }

  // =========================================================================
  // 6. CÓPIA RICA PARA CLIPBOARD (PRESERVA FORMATAÇÃO EXATA NO WORD)
  // =========================================================================

  async function copyReportRichText() {
    if (!dom.reportPaper) return;

    let richHtml = dom.reportPaper.innerHTML;

    // Regra específica Word: espaçamento posterior de "OVÁRIOS" = 0pt e anterior de "Ovário Direito" = 0pt
    richHtml = richHtml.replace(
      /<p class="report-section-title"><b>OVÁRIOS<\/b><\/p>/gi,
      '<p class="report-section-title" style="margin-top: 12pt; margin-bottom: 0pt; mso-para-margin-top: 12pt; mso-para-margin-bottom: 0pt;"><b>OVÁRIOS</b></p>'
    );
    richHtml = richHtml.replace(
      /<p class="report-subhead report-subhead-first"><b>Ovário Direito<\/b><\/p>/gi,
      '<p class="report-subhead report-subhead-first" style="margin-top: 0pt; margin-bottom: 0pt; mso-para-margin-top: 0pt; mso-para-margin-bottom: 0pt;"><b>Ovário Direito</b></p>'
    );

    // Garantir que as linhas em branco (como entre a frase do Útero e do Saco Gestacional) sejam preservadas no Word
    richHtml = richHtml.replace(
      /<p class="report-blank-line"[^>]*>[\s\S]*?<\/p>/gi,
      '<p class="report-blank-line" style="margin: 0pt; padding: 0pt; mso-para-margin: 0pt; font-size: 11pt; line-height: 1.25;">&nbsp;</p>'
    );

    const formattedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {
  font-family: Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.25;
  color: #000000;
  text-align: justify;
}
p {
  margin: 0;
  padding: 0;
  line-height: 1.25;
  mso-para-margin: 0pt;
}
.report-title {
  text-align: center;
  font-weight: bold;
  margin-bottom: 12pt;
  mso-para-margin-bottom: 12pt;
}
.report-blank-line {
  margin: 0;
  padding: 0;
  line-height: 1.25;
  font-size: 11pt;
  mso-para-margin: 0pt;
}
.report-section-title {
  font-weight: bold;
  text-transform: uppercase;
  margin-top: 12pt;
  margin-bottom: 0pt;
  mso-para-margin-top: 12pt;
  mso-para-margin-bottom: 0pt;
}
.report-subhead {
  font-weight: bold;
  margin-top: 12pt;
  margin-bottom: 0pt;
  mso-para-margin-top: 12pt;
  mso-para-margin-bottom: 0pt;
}
.report-subhead-first {
  font-weight: bold;
  margin-top: 0pt !important;
  margin-bottom: 0pt !important;
  mso-para-margin-top: 0pt !important;
  mso-para-margin-bottom: 0pt !important;
}
.report-obs {
  margin-top: 36pt;
}
b, strong {
  font-weight: bold;
}
</style>
</head>
<body>
${richHtml}
</body>
</html>`;

    const plainText = dom.reportPaper.innerText;

    let success = false;
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const blobHtml = new Blob([formattedHtml], { type: 'text/html' });
        const blobText = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        });
        await navigator.clipboard.write([item]);
        success = true;
      } catch (err) {
        console.warn('ClipboardItem error, falling back:', err);
      }
    }

    if (!success) {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(dom.reportPaper);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        success = true;
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
    }

    showToast(success ? 'Laudo copiado com formatação rica para o Word!' : 'Falha ao copiar laudo.');
  }

  function showToast(message) {
    if (!dom.toastNotice || !dom.toastMessage) return;
    dom.toastMessage.textContent = message;
    dom.toastNotice.classList.add('show');
    setTimeout(() => {
      dom.toastNotice.classList.remove('show');
    }, 3200);
  }

  // =========================================================================
  // 7. SINCRONIZAÇÃO ENTRE ESTADO E FORMULÁRIO (INICIALIZAÇÃO ZERADA/LIMPA)
  // =========================================================================

  function resetToDefault() {
    state.isManualEdit = false;
    if (dom.manualEditBadge) dom.manualEditBadge.classList.remove('active');
    if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';

    // Todos os campos numéricos iniciam completamente vazios (sem dados fictícios)
    state.cronologia.dumStatus = 'sim';
    state.cronologia.dum = '';
    state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    state.cronologia.exameAnt = 'nao';
    state.cronologia.exameAntData = '';
    state.cronologia.exameAntSem = '';
    state.cronologia.exameAntDias = '';
    state.cronologia.viaExame = 'transvaginal';
    state.cronologia.bexiga = 'vazia';

    state.utero.posicao = 'em anteversão';
    state.utero.d1 = '';
    state.utero.d2 = '';
    state.utero.d3 = '';
    state.utero.volume = null;

    state.sacoGestacional.d1 = '';
    state.sacoGestacional.d2 = '';
    state.sacoGestacional.d3 = '';
    state.sacoGestacional.medio = null;
    state.sacoGestacional.medioDireto = '';

    state.hematoma.presente = false;
    state.hematoma.d1 = '';
    state.hematoma.d2 = '';
    state.hematoma.d3 = '';
    state.hematoma.obsPaciente = false;

    state.vesicula.status = 'identificada';
    state.vesicula.medidaMm = '';

    state.embriao.identificado = true;
    state.embriao.ccn = '';
    state.embriao.igCcn = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    state.embriao.bcfStatus = 'presentes';
    state.embriao.bcf = '';

    state.ovarioDireito.estado = 'caracterizado';
    state.ovarioDireito.temAchados = false;
    state.ovarioDireito.d1 = '';
    state.ovarioDireito.d2 = '';
    state.ovarioDireito.d3 = '';
    state.ovarioDireito.volume = null;
    state.ovarioDireito.justificativa = 'interposicao';
    state.ovarioDireito.outraJustificativa = '';
    state.ovarioDireito.anexoHabitual = false;
    state.ovarioDireito.achados = {
      corpoLuteo: { ativo: false, conclusao: false },
      cistosFuncionais: { ativo: false, conclusao: false },
      foliculo: { ativo: false, conclusao: false },
      outro: { ativo: false, texto: '', conclusao: false }
    };

    state.ovarioEsquerdo.estado = 'caracterizado';
    state.ovarioEsquerdo.temAchados = false;
    state.ovarioEsquerdo.d1 = '';
    state.ovarioEsquerdo.d2 = '';
    state.ovarioEsquerdo.d3 = '';
    state.ovarioEsquerdo.volume = null;
    state.ovarioEsquerdo.justificativa = 'interposicao';
    state.ovarioEsquerdo.outraJustificativa = '';
    state.ovarioEsquerdo.anexoHabitual = false;
    state.ovarioEsquerdo.achados = {
      corpoLuteo: { ativo: false, conclusao: false },
      cistosFuncionais: { ativo: false, conclusao: false },
      foliculo: { ativo: false, conclusao: false },
      outro: { ativo: false, texto: '', conclusao: false }
    };

    state.fundoDouglas = 'livre';

    syncDomFromState();
    updateCalculations();
  }

  function syncDomFromState() {
    // Cronologia
    dom.selDumStatus.value = state.cronologia.dumStatus;
    dom.inputDum.value = state.cronologia.dum;
    dom.groupDumData.style.display = state.cronologia.dumStatus === 'sim' ? 'flex' : 'none';

    dom.selExameAnt.value = state.cronologia.exameAnt;
    dom.panelExameAnt.style.display = state.cronologia.exameAnt === 'sim' ? 'flex' : 'none';
    dom.inputExameAntData.value = state.cronologia.exameAntData;
    dom.inputExameAntSem.value = state.cronologia.exameAntSem;
    dom.inputExameAntDias.value = state.cronologia.exameAntDias;

    dom.selViaExame.value = state.cronologia.viaExame;
    dom.selBexiga.value = state.cronologia.bexiga;

    // Útero
    dom.selPosicaoUtero.value = state.utero.posicao;
    dom.uteroD1.value = state.utero.d1;
    dom.uteroD2.value = state.utero.d2;
    dom.uteroD3.value = state.utero.d3;

    // SG
    dom.sgD1.value = state.sacoGestacional.d1;
    dom.sgD2.value = state.sacoGestacional.d2;
    dom.sgD3.value = state.sacoGestacional.d3;
    if (dom.sgMedioInput) {
      dom.sgMedioInput.value = state.sacoGestacional.medio ? formatNumBR(state.sacoGestacional.medio) : '';
    }

    // Hematoma
    dom.btnHematomaNao.classList.toggle('active', !state.hematoma.presente);
    dom.btnHematomaSim.classList.toggle('active', state.hematoma.presente);
    dom.panelHematoma.style.display = state.hematoma.presente ? 'flex' : 'none';
    dom.hemD1.value = state.hematoma.d1;
    dom.hemD2.value = state.hematoma.d2;
    dom.hemD3.value = state.hematoma.d3;
    dom.chkHematomaObs.checked = state.hematoma.obsPaciente;

    // Vesícula
    dom.selVesicula.value = state.vesicula.status;
    dom.groupVesiculaMedida.style.display = state.vesicula.status === 'identificada' ? 'flex' : 'none';
    dom.inputVesiculaMm.value = state.vesicula.medidaMm;

    // Embrião
    dom.btnEmbIdentificado.classList.toggle('active', state.embriao.identificado);
    dom.btnEmbNaoIdentificado.classList.toggle('active', !state.embriao.identificado);
    dom.panelEmbriao.style.display = state.embriao.identificado ? 'flex' : 'none';
    dom.inputCcn.value = state.embriao.ccn;
    dom.selBcfStatus.value = state.embriao.bcfStatus;
    dom.groupBcfValor.style.display = state.embriao.bcfStatus === 'presentes' ? 'flex' : 'none';
    dom.inputBcf.value = state.embriao.bcf;

    // Ovário Direito
    dom.selOdEstado.value = state.ovarioDireito.estado;
    if (dom.panelOdCaracterizado) {
      dom.panelOdCaracterizado.style.display = state.ovarioDireito.estado === 'caracterizado' ? 'block' : 'none';
    }
    dom.panelOdNaoCaract.style.display = state.ovarioDireito.estado === 'nao_caracterizado' ? 'block' : 'none';
    dom.odD1.value = state.ovarioDireito.d1;
    dom.odD2.value = state.ovarioDireito.d2;
    dom.odD3.value = state.ovarioDireito.d3;

    dom.selOdJustificativa.value = state.ovarioDireito.justificativa;
    dom.groupOdOutraJust.style.display = state.ovarioDireito.justificativa === 'outra' ? 'flex' : 'none';
    dom.inputOdOutraJust.value = state.ovarioDireito.outraJustificativa;
    dom.chkOdAnexoHabitual.checked = state.ovarioDireito.anexoHabitual;

    // Achados OD
    dom.btnOdAchadosNao.classList.toggle('active', !state.ovarioDireito.temAchados);
    dom.btnOdAchadosSim.classList.toggle('active', state.ovarioDireito.temAchados);
    dom.panelOdAchados.style.display = state.ovarioDireito.temAchados ? 'block' : 'none';

    dom.chkOdCorpoLuteo.checked = state.ovarioDireito.achados.corpoLuteo.ativo;
    dom.groupOdCorpoLuteo.style.display = state.ovarioDireito.achados.corpoLuteo.ativo ? 'block' : 'none';
    dom.btnOdClConclNao.classList.toggle('active', !state.ovarioDireito.achados.corpoLuteo.conclusao);
    dom.btnOdClConclSim.classList.toggle('active', state.ovarioDireito.achados.corpoLuteo.conclusao);

    dom.chkOdCistosFuncionais.checked = state.ovarioDireito.achados.cistosFuncionais.ativo;
    dom.groupOdCistosFuncionais.style.display = state.ovarioDireito.achados.cistosFuncionais.ativo ? 'block' : 'none';
    dom.btnOdCfConclNao.classList.toggle('active', !state.ovarioDireito.achados.cistosFuncionais.conclusao);
    dom.btnOdCfConclSim.classList.toggle('active', state.ovarioDireito.achados.cistosFuncionais.conclusao);

    dom.chkOdFoliculo.checked = state.ovarioDireito.achados.foliculo.ativo;
    dom.groupOdFoliculo.style.display = state.ovarioDireito.achados.foliculo.ativo ? 'block' : 'none';
    dom.btnOdFolConclNao.classList.toggle('active', !state.ovarioDireito.achados.foliculo.conclusao);
    dom.btnOdFolConclSim.classList.toggle('active', state.ovarioDireito.achados.foliculo.conclusao);

    dom.chkOdOutro.checked = state.ovarioDireito.achados.outro.ativo;
    dom.groupOdOutro.style.display = state.ovarioDireito.achados.outro.ativo ? 'block' : 'none';
    dom.odOutroTexto.value = state.ovarioDireito.achados.outro.texto;
    dom.btnOdOutroConclNao.classList.toggle('active', !state.ovarioDireito.achados.outro.conclusao);
    dom.btnOdOutroConclSim.classList.toggle('active', state.ovarioDireito.achados.outro.conclusao);

    // Ovário Esquerdo
    dom.selOeEstado.value = state.ovarioEsquerdo.estado;
    if (dom.panelOeCaracterizado) {
      dom.panelOeCaracterizado.style.display = state.ovarioEsquerdo.estado === 'caracterizado' ? 'block' : 'none';
    }
    dom.panelOeNaoCaract.style.display = state.ovarioEsquerdo.estado === 'nao_caracterizado' ? 'block' : 'none';
    dom.oeD1.value = state.ovarioEsquerdo.d1;
    dom.oeD2.value = state.ovarioEsquerdo.d2;
    dom.oeD3.value = state.ovarioEsquerdo.d3;

    dom.selOeJustificativa.value = state.ovarioEsquerdo.justificativa;
    dom.groupOeOutraJust.style.display = state.ovarioEsquerdo.justificativa === 'outra' ? 'flex' : 'none';
    dom.inputOeOutraJust.value = state.ovarioEsquerdo.outraJustificativa;
    dom.chkOeAnexoHabitual.checked = state.ovarioEsquerdo.anexoHabitual;

    // Achados OE
    dom.btnOeAchadosNao.classList.toggle('active', !state.ovarioEsquerdo.temAchados);
    dom.btnOeAchadosSim.classList.toggle('active', state.ovarioEsquerdo.temAchados);
    dom.panelOeAchados.style.display = state.ovarioEsquerdo.temAchados ? 'block' : 'none';

    dom.chkOeCorpoLuteo.checked = state.ovarioEsquerdo.achados.corpoLuteo.ativo;
    dom.groupOeCorpoLuteo.style.display = state.ovarioEsquerdo.achados.corpoLuteo.ativo ? 'block' : 'none';
    dom.btnOeClConclNao.classList.toggle('active', !state.ovarioEsquerdo.achados.corpoLuteo.conclusao);
    dom.btnOeClConclSim.classList.toggle('active', state.ovarioEsquerdo.achados.corpoLuteo.conclusao);

    dom.chkOeCistosFuncionais.checked = state.ovarioEsquerdo.achados.cistosFuncionais.ativo;
    dom.groupOeCistosFuncionais.style.display = state.ovarioEsquerdo.achados.cistosFuncionais.ativo ? 'block' : 'none';
    dom.btnOeCfConclNao.classList.toggle('active', !state.ovarioEsquerdo.achados.cistosFuncionais.conclusao);
    dom.btnOeCfConclSim.classList.toggle('active', state.ovarioEsquerdo.achados.cistosFuncionais.conclusao);

    dom.chkOeFoliculo.checked = state.ovarioEsquerdo.achados.foliculo.ativo;
    dom.groupOeFoliculo.style.display = state.ovarioEsquerdo.achados.foliculo.ativo ? 'block' : 'none';
    dom.btnOeFolConclNao.classList.toggle('active', !state.ovarioEsquerdo.achados.foliculo.conclusao);
    dom.btnOeFolConclSim.classList.toggle('active', state.ovarioEsquerdo.achados.foliculo.conclusao);

    dom.chkOeOutro.checked = state.ovarioEsquerdo.achados.outro.ativo;
    dom.groupOeOutro.style.display = state.ovarioEsquerdo.achados.outro.ativo ? 'block' : 'none';
    dom.oeOutroTexto.value = state.ovarioEsquerdo.achados.outro.texto;
    dom.btnOeOutroConclNao.classList.toggle('active', !state.ovarioEsquerdo.achados.outro.conclusao);
    dom.btnOeOutroConclSim.classList.toggle('active', state.ovarioEsquerdo.achados.outro.conclusao);

    // Fundo de Saco de Douglas
    if (dom.selDouglas) dom.selDouglas.value = state.fundoDouglas;
  }

  // =========================================================================
  // 8. OUVINTES DE EVENTOS (INTERATIVIDADE COMPLETA)
  // =========================================================================

  function setupEventListeners() {
    // Alternância de tema
    if (dom.themeToggleBtn) {
      dom.themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('meuultrassom_theme', isDark ? 'dark' : 'light');
        updateThemeIcons(isDark);
      });
    }

    // Cronologia
    applyDateMask(dom.inputDum);
    applyDateMask(dom.inputExameAntData);

    dom.selDumStatus.addEventListener('change', () => {
      state.cronologia.dumStatus = dom.selDumStatus.value;
      dom.groupDumData.style.display = state.cronologia.dumStatus === 'sim' ? 'flex' : 'none';
      updateCalculations();
    });

    dom.inputDum.addEventListener('input', () => {
      state.cronologia.dum = dom.inputDum.value.trim();
      updateCalculations();
    });

    dom.selExameAnt.addEventListener('change', () => {
      state.cronologia.exameAnt = dom.selExameAnt.value;
      dom.panelExameAnt.style.display = state.cronologia.exameAnt === 'sim' ? 'flex' : 'none';
      updateCalculations();
    });

    dom.inputExameAntData.addEventListener('input', () => {
      state.cronologia.exameAntData = dom.inputExameAntData.value.trim();
      updateCalculations();
    });

    dom.inputExameAntSem.addEventListener('input', () => {
      state.cronologia.exameAntSem = dom.inputExameAntSem.value.trim();
      updateCalculations();
    });

    dom.inputExameAntDias.addEventListener('input', () => {
      state.cronologia.exameAntDias = dom.inputExameAntDias.value.trim();
      updateCalculations();
    });

    dom.selViaExame.addEventListener('change', () => {
      state.cronologia.viaExame = dom.selViaExame.value;
      updateCalculations();
    });

    dom.selBexiga.addEventListener('change', () => {
      state.cronologia.bexiga = dom.selBexiga.value;
      updateCalculations();
    });

    // Útero e Saco Gestacional
    dom.selPosicaoUtero.addEventListener('change', () => {
      state.utero.posicao = dom.selPosicaoUtero.value;
      updateCalculations();
    });

    [dom.uteroD1, dom.uteroD2, dom.uteroD3].forEach(input => {
      input.addEventListener('input', () => {
        state.utero.d1 = dom.uteroD1.value.trim();
        state.utero.d2 = dom.uteroD2.value.trim();
        state.utero.d3 = dom.uteroD3.value.trim();
        updateCalculations();
      });
    });

    // Saco Gestacional — Cálculo automático pelas 3 medidas
    [dom.sgD1, dom.sgD2, dom.sgD3].forEach(input => {
      input.addEventListener('input', () => {
        state.sacoGestacional.d1 = dom.sgD1.value.trim();
        state.sacoGestacional.d2 = dom.sgD2.value.trim();
        state.sacoGestacional.d3 = dom.sgD3.value.trim();

        const calc = calculateMeanDiameter(state.sacoGestacional.d1, state.sacoGestacional.d2, state.sacoGestacional.d3);
        if (calc) {
          state.sacoGestacional.medio = calc;
          state.sacoGestacional.medioDireto = '';
          if (dom.sgMedioInput) dom.sgMedioInput.value = formatNumBR(calc);
        } else {
          if (state.sacoGestacional.medioDireto) {
            state.sacoGestacional.medio = state.sacoGestacional.medioDireto;
          } else {
            state.sacoGestacional.medio = null;
            if (dom.sgMedioInput && !state.sacoGestacional.d1 && !state.sacoGestacional.d2 && !state.sacoGestacional.d3) {
              dom.sgMedioInput.value = '';
            }
          }
        }
        updateCalculations();
      });
    });

    // Saco Gestacional — Inserção direta do Diâmetro Médio
    if (dom.sgMedioInput) {
      dom.sgMedioInput.addEventListener('input', () => {
        const val = dom.sgMedioInput.value.trim();
        state.sacoGestacional.medioDireto = val;
        state.sacoGestacional.medio = val ? val : null;
        updateCalculations();
      });
    }

    // Hematoma Subcoriônico
    dom.btnHematomaNao.addEventListener('click', () => {
      state.hematoma.presente = false;
      dom.btnHematomaNao.classList.add('active');
      dom.btnHematomaSim.classList.remove('active');
      dom.panelHematoma.style.display = 'none';
      updateCalculations();
    });

    dom.btnHematomaSim.addEventListener('click', () => {
      state.hematoma.presente = true;
      dom.btnHematomaSim.classList.add('active');
      dom.btnHematomaNao.classList.remove('active');
      dom.panelHematoma.style.display = 'flex';
      updateCalculations();
    });

    [dom.hemD1, dom.hemD2, dom.hemD3].forEach(input => {
      input.addEventListener('input', () => {
        state.hematoma.d1 = dom.hemD1.value.trim();
        state.hematoma.d2 = dom.hemD2.value.trim();
        state.hematoma.d3 = dom.hemD3.value.trim();
        updateCalculations();
      });
    });

    dom.chkHematomaObs.addEventListener('change', () => {
      state.hematoma.obsPaciente = dom.chkHematomaObs.checked;
      updateCalculations();
    });

    // Vesícula Vitelínica
    dom.selVesicula.addEventListener('change', () => {
      state.vesicula.status = dom.selVesicula.value;
      dom.groupVesiculaMedida.style.display = state.vesicula.status === 'identificada' ? 'flex' : 'none';
      updateCalculations();
    });

    dom.inputVesiculaMm.addEventListener('input', () => {
      state.vesicula.medidaMm = dom.inputVesiculaMm.value.trim();
      updateCalculations();
    });

    // Embrião
    dom.btnEmbIdentificado.addEventListener('click', () => {
      state.embriao.identificado = true;
      dom.btnEmbIdentificado.classList.add('active');
      dom.btnEmbNaoIdentificado.classList.remove('active');
      dom.panelEmbriao.style.display = 'flex';
      updateCalculations();
    });

    dom.btnEmbNaoIdentificado.addEventListener('click', () => {
      state.embriao.identificado = false;
      dom.btnEmbNaoIdentificado.classList.add('active');
      dom.btnEmbIdentificado.classList.remove('active');
      dom.panelEmbriao.style.display = 'none';
      updateCalculations();
    });

    dom.inputCcn.addEventListener('input', () => {
      state.embriao.ccn = dom.inputCcn.value.trim();
      updateCalculations();
    });

    dom.selBcfStatus.addEventListener('change', () => {
      state.embriao.bcfStatus = dom.selBcfStatus.value;
      dom.groupBcfValor.style.display = state.embriao.bcfStatus === 'presentes' ? 'flex' : 'none';
      updateCalculations();
    });

    dom.inputBcf.addEventListener('input', () => {
      state.embriao.bcf = dom.inputBcf.value.trim();
      updateCalculations();
    });

    // Ovário Direito
    dom.selOdEstado.addEventListener('change', () => {
      state.ovarioDireito.estado = dom.selOdEstado.value;
      if (dom.panelOdCaracterizado) {
        dom.panelOdCaracterizado.style.display = state.ovarioDireito.estado === 'caracterizado' ? 'block' : 'none';
      }
      dom.panelOdNaoCaract.style.display = state.ovarioDireito.estado === 'nao_caracterizado' ? 'block' : 'none';
      updateCalculations();
    });

    [dom.odD1, dom.odD2, dom.odD3].forEach(input => {
      input.addEventListener('input', () => {
        state.ovarioDireito.d1 = dom.odD1.value.trim();
        state.ovarioDireito.d2 = dom.odD2.value.trim();
        state.ovarioDireito.d3 = dom.odD3.value.trim();
        updateCalculations();
      });
    });

    dom.selOdJustificativa.addEventListener('change', () => {
      state.ovarioDireito.justificativa = dom.selOdJustificativa.value;
      dom.groupOdOutraJust.style.display = state.ovarioDireito.justificativa === 'outra' ? 'flex' : 'none';
      updateCalculations();
    });

    dom.inputOdOutraJust.addEventListener('input', () => {
      state.ovarioDireito.outraJustificativa = dom.inputOdOutraJust.value.trim();
      updateCalculations();
    });

    dom.chkOdAnexoHabitual.addEventListener('change', () => {
      state.ovarioDireito.anexoHabitual = dom.chkOdAnexoHabitual.checked;
      updateCalculations();
    });

    // Achados OD — Apresenta algum achado variável?
    dom.btnOdAchadosNao.addEventListener('click', () => {
      state.ovarioDireito.temAchados = false;
      dom.btnOdAchadosNao.classList.add('active');
      dom.btnOdAchadosSim.classList.remove('active');
      dom.panelOdAchados.style.display = 'none';
      updateCalculations();
    });

    dom.btnOdAchadosSim.addEventListener('click', () => {
      state.ovarioDireito.temAchados = true;
      dom.btnOdAchadosSim.classList.add('active');
      dom.btnOdAchadosNao.classList.remove('active');
      dom.panelOdAchados.style.display = 'block';
      updateCalculations();
    });

    // Achados OD individuais
    dom.chkOdCorpoLuteo.addEventListener('change', () => {
      state.ovarioDireito.achados.corpoLuteo.ativo = dom.chkOdCorpoLuteo.checked;
      dom.groupOdCorpoLuteo.style.display = dom.chkOdCorpoLuteo.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.btnOdClConclNao.addEventListener('click', () => {
      state.ovarioDireito.achados.corpoLuteo.conclusao = false;
      dom.btnOdClConclNao.classList.add('active');
      dom.btnOdClConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOdClConclSim.addEventListener('click', () => {
      state.ovarioDireito.achados.corpoLuteo.conclusao = true;
      dom.btnOdClConclSim.classList.add('active');
      dom.btnOdClConclNao.classList.remove('active');
      updateCalculations();
    });

    dom.chkOdCistosFuncionais.addEventListener('change', () => {
      state.ovarioDireito.achados.cistosFuncionais.ativo = dom.chkOdCistosFuncionais.checked;
      dom.groupOdCistosFuncionais.style.display = dom.chkOdCistosFuncionais.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.btnOdCfConclNao.addEventListener('click', () => {
      state.ovarioDireito.achados.cistosFuncionais.conclusao = false;
      dom.btnOdCfConclNao.classList.add('active');
      dom.btnOdCfConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOdCfConclSim.addEventListener('click', () => {
      state.ovarioDireito.achados.cistosFuncionais.conclusao = true;
      dom.btnOdCfConclSim.classList.add('active');
      dom.btnOdCfConclNao.classList.remove('active');
      updateCalculations();
    });

    dom.chkOdFoliculo.addEventListener('change', () => {
      state.ovarioDireito.achados.foliculo.ativo = dom.chkOdFoliculo.checked;
      dom.groupOdFoliculo.style.display = dom.chkOdFoliculo.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.btnOdFolConclNao.addEventListener('click', () => {
      state.ovarioDireito.achados.foliculo.conclusao = false;
      dom.btnOdFolConclNao.classList.add('active');
      dom.btnOdFolConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOdFolConclSim.addEventListener('click', () => {
      state.ovarioDireito.achados.foliculo.conclusao = true;
      dom.btnOdFolConclSim.classList.add('active');
      dom.btnOdFolConclNao.classList.remove('active');
      updateCalculations();
    });

    dom.chkOdOutro.addEventListener('change', () => {
      state.ovarioDireito.achados.outro.ativo = dom.chkOdOutro.checked;
      dom.groupOdOutro.style.display = dom.chkOdOutro.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.odOutroTexto.addEventListener('input', () => {
      state.ovarioDireito.achados.outro.texto = dom.odOutroTexto.value.trim();
      updateCalculations();
    });
    dom.btnOdOutroConclNao.addEventListener('click', () => {
      state.ovarioDireito.achados.outro.conclusao = false;
      dom.btnOdOutroConclNao.classList.add('active');
      dom.btnOdOutroConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOdOutroConclSim.addEventListener('click', () => {
      state.ovarioDireito.achados.outro.conclusao = true;
      dom.btnOdOutroConclSim.classList.add('active');
      dom.btnOdOutroConclNao.classList.remove('active');
      updateCalculations();
    });

    // Ovário Esquerdo
    dom.selOeEstado.addEventListener('change', () => {
      state.ovarioEsquerdo.estado = dom.selOeEstado.value;
      if (dom.panelOeCaracterizado) {
        dom.panelOeCaracterizado.style.display = state.ovarioEsquerdo.estado === 'caracterizado' ? 'block' : 'none';
      }
      dom.panelOeNaoCaract.style.display = state.ovarioEsquerdo.estado === 'nao_caracterizado' ? 'block' : 'none';
      updateCalculations();
    });

    [dom.oeD1, dom.oeD2, dom.oeD3].forEach(input => {
      input.addEventListener('input', () => {
        state.ovarioEsquerdo.d1 = dom.oeD1.value.trim();
        state.ovarioEsquerdo.d2 = dom.oeD2.value.trim();
        state.ovarioEsquerdo.d3 = dom.oeD3.value.trim();
        updateCalculations();
      });
    });

    dom.selOeJustificativa.addEventListener('change', () => {
      state.ovarioEsquerdo.justificativa = dom.selOeJustificativa.value;
      dom.groupOeOutraJust.style.display = state.ovarioEsquerdo.justificativa === 'outra' ? 'flex' : 'none';
      updateCalculations();
    });

    dom.inputOeOutraJust.addEventListener('input', () => {
      state.ovarioEsquerdo.outraJustificativa = dom.inputOeOutraJust.value.trim();
      updateCalculations();
    });

    dom.chkOeAnexoHabitual.addEventListener('change', () => {
      state.ovarioEsquerdo.anexoHabitual = dom.chkOeAnexoHabitual.checked;
      updateCalculations();
    });

    // Achados OE — Apresenta algum achado variável?
    dom.btnOeAchadosNao.addEventListener('click', () => {
      state.ovarioEsquerdo.temAchados = false;
      dom.btnOeAchadosNao.classList.add('active');
      dom.btnOeAchadosSim.classList.remove('active');
      dom.panelOeAchados.style.display = 'none';
      updateCalculations();
    });

    dom.btnOeAchadosSim.addEventListener('click', () => {
      state.ovarioEsquerdo.temAchados = true;
      dom.btnOeAchadosSim.classList.add('active');
      dom.btnOeAchadosNao.classList.remove('active');
      dom.panelOeAchados.style.display = 'block';
      updateCalculations();
    });

    // Achados OE individuais
    dom.chkOeCorpoLuteo.addEventListener('change', () => {
      state.ovarioEsquerdo.achados.corpoLuteo.ativo = dom.chkOeCorpoLuteo.checked;
      dom.groupOeCorpoLuteo.style.display = dom.chkOeCorpoLuteo.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.btnOeClConclNao.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.corpoLuteo.conclusao = false;
      dom.btnOeClConclNao.classList.add('active');
      dom.btnOeClConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOeClConclSim.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.corpoLuteo.conclusao = true;
      dom.btnOeClConclSim.classList.add('active');
      dom.btnOeClConclNao.classList.remove('active');
      updateCalculations();
    });

    dom.chkOeCistosFuncionais.addEventListener('change', () => {
      state.ovarioEsquerdo.achados.cistosFuncionais.ativo = dom.chkOeCistosFuncionais.checked;
      dom.groupOeCistosFuncionais.style.display = dom.chkOeCistosFuncionais.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.btnOeCfConclNao.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.cistosFuncionais.conclusao = false;
      dom.btnOeCfConclNao.classList.add('active');
      dom.btnOeCfConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOeCfConclSim.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.cistosFuncionais.conclusao = true;
      dom.btnOeCfConclSim.classList.add('active');
      dom.btnOeCfConclNao.classList.remove('active');
      updateCalculations();
    });

    dom.chkOeFoliculo.addEventListener('change', () => {
      state.ovarioEsquerdo.achados.foliculo.ativo = dom.chkOeFoliculo.checked;
      dom.groupOeFoliculo.style.display = dom.chkOeFoliculo.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.btnOeFolConclNao.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.foliculo.conclusao = false;
      dom.btnOeFolConclNao.classList.add('active');
      dom.btnOeFolConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOeFolConclSim.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.foliculo.conclusao = true;
      dom.btnOeFolConclSim.classList.add('active');
      dom.btnOeFolConclNao.classList.remove('active');
      updateCalculations();
    });

    dom.chkOeOutro.addEventListener('change', () => {
      state.ovarioEsquerdo.achados.outro.ativo = dom.chkOeOutro.checked;
      dom.groupOeOutro.style.display = dom.chkOeOutro.checked ? 'block' : 'none';
      updateCalculations();
    });
    dom.oeOutroTexto.addEventListener('input', () => {
      state.ovarioEsquerdo.achados.outro.texto = dom.oeOutroTexto.value.trim();
      updateCalculations();
    });
    dom.btnOeOutroConclNao.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.outro.conclusao = false;
      dom.btnOeOutroConclNao.classList.add('active');
      dom.btnOeOutroConclSim.classList.remove('active');
      updateCalculations();
    });
    dom.btnOeOutroConclSim.addEventListener('click', () => {
      state.ovarioEsquerdo.achados.outro.conclusao = true;
      dom.btnOeOutroConclSim.classList.add('active');
      dom.btnOeOutroConclNao.classList.remove('active');
      updateCalculations();
    });

    // Fundo de Saco de Douglas
    if (dom.selDouglas) {
      dom.selDouglas.addEventListener('change', () => {
        state.fundoDouglas = dom.selDouglas.value;
        updateCalculations();
      });
    }

    // Edição manual direta na folha de laudo
    if (dom.reportPaper) {
      dom.reportPaper.addEventListener('input', () => {
        state.isManualEdit = true;
        if (dom.manualEditBadge) dom.manualEditBadge.classList.add('active');
        if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'inline-flex';
      });
    }

    if (dom.btnRestaurarLaudo) {
      dom.btnRestaurarLaudo.addEventListener('click', () => {
        state.isManualEdit = false;
        if (dom.manualEditBadge) dom.manualEditBadge.classList.remove('active');
        if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
        renderReportText();
        showToast('Texto do laudo restaurado a partir do formulário!');
      });
    }

    // Botão Copiar Laudo (Rich Text)
    if (dom.btnCopiarLaudo) {
      dom.btnCopiarLaudo.addEventListener('click', copyReportRichText);
    }

    // Botão Imprimir
    if (dom.btnImprimir) {
      dom.btnImprimir.addEventListener('click', () => {
        window.print();
      });
    }

    // Modal Novo Exame
    if (dom.btnNovoExame) {
      dom.btnNovoExame.addEventListener('click', () => {
        dom.modalNovoExame.classList.add('active');
      });
    }

    if (dom.btnModalCancel) {
      dom.btnModalCancel.addEventListener('click', () => {
        dom.modalNovoExame.classList.remove('active');
      });
    }

    if (dom.btnModalConfirm) {
      dom.btnModalConfirm.addEventListener('click', () => {
        dom.modalNovoExame.classList.remove('active');
        resetToDefault();
        showToast('Novo exame iniciado!');
      });
    }
  }

  // =========================================================================
  // 9. TEMA E NAVEGAÇÃO
  // =========================================================================

  function initTheme() {
    const savedTheme = localStorage.getItem('meuultrassom_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    updateThemeIcons(isDark);
  }

  function updateThemeIcons(isDark) {
    if (dom.themeIconSun && dom.themeIconMoon) {
      dom.themeIconSun.style.display = isDark ? 'block' : 'none';
      dom.themeIconMoon.style.display = isDark ? 'none' : 'block';
    }
  }

  function initNavigationPayload() {
    try {
      const raw = sessionStorage.getItem('meuultrassom_nav_data');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.tipoExame === 'inicial' && data.igCalculada && data.igCalculada.valid) {
          if (data.igCalculada.metodo === 'DUM' && data.igCalculada.dum) {
            state.cronologia.dum = data.igCalculada.dum;
            state.cronologia.dumStatus = 'sim';
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao ler navegação inicial:', e);
    }
  }

  // =========================================================================
  // 10. INICIALIZAÇÃO
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigationPayload();
    setupEventListeners();
    // Inicia no laudo padrão único, com campos numéricos limpos
    resetToDefault();

    // Exposição global para testes automatizados
    window.MeuUltrassomInicial = {
      state,
      calculateDum,
      calculateCcn,
      calculateVolume,
      calculateMeanDiameter,
      renderReportText,
      copyReportRichText,
      resetToDefault,
      getReportHtml: () => dom.reportPaper.innerHTML,
      getReportText: () => dom.reportPaper.innerText
    };
  });

})();
