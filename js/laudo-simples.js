/**
 * MEUULTRASSOM — MÓDULO OBSTÉTRICO SIMPLES (16 A 41 SEMANAS)
 * Script Principal 100% Independente
 * 
 * Responsabilidades:
 * - Controle de tema claro/escuro persistente
 * - Gestão reativa de estado: Cronologia (DUM, 1ª USG, IG Referida), Estática (Gestação Única), BCF, Placenta, Líquido (ILA/MBV), Morfologia, Biometria e Conclusão
 * - Definição de idade gestacional de referência única e dinâmica (alimenta o laudo, tabela de ILA e percentis)
 * - Tabela dinâmica de referência de ILA Moore (16 a 41 semanas)
 * - Classificação automática e alerta visual para valores fora de referência do ILA com sincronização na Conclusão
 * - Fórmulas biométricas Hadlock (Peso fetal, percentil e índices CC/CA e DBP/DOF)
 * - Renderização em tempo real na folha A4 com estrita fidelidade aos modelos Word de 16 a 41 semanas
 * - Cópia rica para o Microsoft Word preservando 100% da formatação
 * - Botão e modal de novo exame e integração com dados de navegação da página inicial
 */

(function() {
  'use strict';

  // =========================================================================
  // 1. TABELA DE REFERÊNCIA DE ILA (MOORE ET AL.) — 16 A 41 SEMANAS
  // =========================================================================
  const TABELA_ILA_REFERENCIA = {
    16: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    17: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    18: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    19: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    20: { min: 93, max: 212 },
    21: { min: 95, max: 214 },
    22: { min: 97, max: 216 },
    23: { min: 98, max: 218 },
    24: { min: 97, max: 221 },
    25: { min: 98, max: 219 },
    26: { min: 97, max: 223 },
    27: { min: 95, max: 226 },
    28: { min: 94, max: 228 },
    29: { min: 92, max: 231 },
    30: { min: 90, max: 234 },
    31: { min: 88, max: 238 },
    32: { min: 86, max: 242 },
    33: { min: 83, max: 245 },
    34: { min: 81, max: 248 },
    35: { min: 79, max: 249 },
    36: { min: 77, max: 249 },
    37: { min: 75, max: 244 },
    38: { min: 73, max: 239 },
    39: { min: 72, max: 226 },
    40: { min: 71, max: 214 },
    41: { min: 70, max: 194 }
  };

  // =========================================================================
  // 2. ESTADO CENTRALIZADO DO MÓDULO OBSTÉTRICO SIMPLES
  // =========================================================================
  const state = {
    isManualEdit: false,

    cronologia: {
      dumStatus: 'sim', // 'sim' | 'incerta' | 'nao'
      dum: '',
      dumCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      dumPadrao: true, // true (SIM) | false (NÃO)

      // Método alternativo quando DUM não é usada como padrão
      metodoAlternativo: 'primeira_usg', // 'primeira_usg' | 'referida'

      // Opção A: Primeira Ultrassonografia
      primeiraUsgData: '',
      primeiraUsgSem: '',
      primeiraUsgDias: '',
      primeiraUsgCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },

      // Opção B: Idade Gestacional Referida
      igReferidaSem: 28,
      igReferidaDias: 0,

      // Idade Gestacional de Referência Ativa Unificada
      igAtiva: { semanas: 28, dias: 0, metodo: 'dum', origemTexto: 'pela DUM', dpp: '' }
    },

    estatica: {
      situacao: 'longitudinal', // 'longitudinal' | 'transversa' | 'obliqua'
      apresentacao: 'cefalica', // 'cefalica' | 'pelvica' | 'cormica'
      dorso: 'direita', // 'direita' | 'esquerda' | 'anterior' | 'posterior'
      movimentacao: 'ativa_normal' // 'ativa_normal' | 'presente_diminuida' | 'ausente'
    },

    bcf: '', // bpm

    placenta: {
      insercao: 'corporal anterior',
      grau: 'I',
      espessura: '', // mm
      longeDoOic: true,
      cordao: 'tres_vasos' // 'tres_vasos' | 'arteria_unica' | 'circular'
    },

    liquido: {
      // Campos iniciam estritamente vazios (sem valores fictícios)
      ila: '', // mm
      maiorBolsao: '', // mm
      classificacao: 'normal', // 'normal' | 'diminuido' | 'oligoidramnio' | 'aumentado' | 'polidramnio'
      statusRef: 'aguardando' // 'aguardando' | 'normal' | 'abaixo' | 'acima'
    },

    morfologia: {
      padrao: true,
      obs: ''
    },

    biometria: {
      dbp: '',
      dof: '',
      cc: '',
      ca: '',
      cf: '',
      cu: '',
      ccCa: null,
      indiceCefalico: null,
      peso: null,
      percentil: null,
      igBiometria: { valid: false, semanas: 0, dias: 0, margemDias: 14 }
    },

    conclusao: {
      crescimento: 'adequado',
      vitalidade: 'adequada',
      obs: '',
      notaFinal: true
    }
  };

  // =========================================================================
  // 3. ELEMENTOS DOM
  // =========================================================================
  const dom = {};

  function initDom() {
    dom.themeToggleBtn = document.getElementById('themeToggleBtn');
    dom.themeIconSun = document.getElementById('themeIconSun');
    dom.themeIconMoon = document.getElementById('themeIconMoon');

    // Cronologia
    dom.selDumStatus = document.getElementById('selDumStatus');
    dom.containerDum = document.getElementById('containerDum');
    dom.groupDumData = document.getElementById('groupDumData');
    dom.inputDum = document.getElementById('inputDum');
    dom.dumFeedbackBox = document.getElementById('dumFeedbackBox');
    dom.dumIgDisplay = document.getElementById('dumIgDisplay');

    dom.btnDumPadraoSim = document.getElementById('btnDumPadraoSim');
    dom.btnDumPadraoNao = document.getElementById('btnDumPadraoNao');

    dom.containerDatacaoAlternativa = document.getElementById('containerDatacaoAlternativa');
    dom.btnMetodoPrimeiraUsg = document.getElementById('btnMetodoPrimeiraUsg');
    dom.btnMetodoReferida = document.getElementById('btnMetodoReferida');

    dom.panelPrimeiraUsg = document.getElementById('panelPrimeiraUsg');
    dom.inputPrimeiraUsgData = document.getElementById('inputPrimeiraUsgData');
    dom.inputPrimeiraUsgSem = document.getElementById('inputPrimeiraUsgSem');
    dom.inputPrimeiraUsgDias = document.getElementById('inputPrimeiraUsgDias');
    dom.primeiraUsgFeedbackBox = document.getElementById('primeiraUsgFeedbackBox');
    dom.primeiraUsgIgDisplay = document.getElementById('primeiraUsgIgDisplay');

    dom.panelIgReferida = document.getElementById('panelIgReferida');
    dom.inputIgReferidaSem = document.getElementById('inputIgReferidaSem');
    dom.inputIgReferidaDias = document.getElementById('inputIgReferidaDias');

    dom.displayIgVigente = document.getElementById('displayIgVigente');

    // Estática (Gestação única exclusiva)
    dom.selSituacao = document.getElementById('selSituacao');
    dom.selApresentacao = document.getElementById('selApresentacao');
    dom.selDorso = document.getElementById('selDorso');
    dom.selMovimentacao = document.getElementById('selMovimentacao');

    // BCF (Seção Própria Independente)
    dom.inputFcf = document.getElementById('inputFcf');

    // Placenta
    dom.selPlacentaInsercao = document.getElementById('selPlacentaInsercao');
    dom.selPlacentaGrau = document.getElementById('selPlacentaGrau');
    dom.inputPlacentaEspessura = document.getElementById('inputPlacentaEspessura');
    dom.btnPlacentaDistanteSim = document.getElementById('btnPlacentaDistanteSim');
    dom.btnPlacentaDistanteNao = document.getElementById('btnPlacentaDistanteNao');
    dom.selCordao = document.getElementById('selCordao');

    // Líquido Amniótico (Apenas ILA e Maior Bolsão)
    dom.inputIla = document.getElementById('inputIla');
    dom.inputMaiorBolsao = document.getElementById('inputMaiorBolsao');
    dom.ilaRefDisplay = document.getElementById('ilaRefDisplay');
    dom.ilaRefTexto = document.getElementById('ilaRefTexto');
    dom.ilaFeedbackNormal = document.getElementById('ilaFeedbackNormal');
    dom.ilaFeedbackAlerta = document.getElementById('ilaFeedbackAlerta');
    dom.ilaAlertaTexto = document.getElementById('ilaAlertaTexto');
    dom.panelIlaClassificacao = document.getElementById('panelIlaClassificacao');
    dom.selIlaClassificacao = document.getElementById('selIlaClassificacao');

    // Morfologia
    dom.btnMorfoPadrao = document.getElementById('btnMorfoPadrao');
    dom.btnMorfoPersonalizada = document.getElementById('btnMorfoPersonalizada');
    dom.morfoPadraoInfo = document.getElementById('morfoPadraoInfo');
    dom.morfoPersonalizadaPanel = document.getElementById('morfoPersonalizadaPanel');
    dom.inputMorfoObs = document.getElementById('inputMorfoObs');

    // Biometria
    dom.inputDbp = document.getElementById('inputDbp');
    dom.inputDof = document.getElementById('inputDof');
    dom.inputCc = document.getElementById('inputCc');
    dom.inputCa = document.getElementById('inputCa');
    dom.inputCf = document.getElementById('inputCf');
    dom.inputCu = document.getElementById('inputCu');

    dom.displayCcCa = document.getElementById('displayCcCa');
    dom.displayDbfDof = document.getElementById('displayDbfDof');
    dom.displayPesoFetal = document.getElementById('displayPesoFetal');
    dom.displayPercentilPeso = document.getElementById('displayPercentilPeso');
    dom.displayIgBiometria = document.getElementById('displayIgBiometria');

    // Conclusão
    dom.selConclusaoCrescimento = document.getElementById('selConclusaoCrescimento');
    dom.selConclusaoVitalidade = document.getElementById('selConclusaoVitalidade');
    dom.inputConclusaoObs = document.getElementById('inputConclusaoObs');
    dom.btnNotaFinalSim = document.getElementById('btnNotaFinalSim');
    dom.btnNotaFinalNao = document.getElementById('btnNotaFinalNao');

    // Toolbar & Laudo
    dom.laudoStatusText = document.getElementById('laudoStatusText');
    dom.manualEditBadge = document.getElementById('manualEditBadge');
    dom.btnRestaurarLaudo = document.getElementById('btnRestaurarLaudo');
    dom.btnNovoExame = document.getElementById('btnNovoExame');
    dom.btnImprimir = document.getElementById('btnImprimir');
    dom.btnCopiarLaudo = document.getElementById('btnCopiarLaudo');
    dom.reportPaper = document.getElementById('reportPaper');

    // Modal & Toast
    dom.modalNovoExame = document.getElementById('modalNovoExame');
    dom.btnModalCancel = document.getElementById('btnModalCancel');
    dom.btnModalConfirm = document.getElementById('btnModalConfirm');
    dom.toastNotice = document.getElementById('toastNotice');
    dom.toastMessage = document.getElementById('toastMessage');
  }

  // =========================================================================
  // 4. FUNÇÕES UTILITÁRIAS, MATEMÁTICAS E CRONOLÓGICAS
  // =========================================================================

  function erf(x) {
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function zToPercentile(z) {
    const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
    let p = Math.round(cdf * 100);
    if (p < 1) p = 1;
    if (p > 99) p = 99;
    return p;
  }

  function parseDateBR(str) {
    if (!str || str.length !== 10) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    const date = new Date(y, m, d);
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
    return date;
  }

  function formatDateBR(date) {
    if (!date || isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function formatNumBR(val, decimals = 1) {
    if (val === null || val === undefined || isNaN(val) || val === '') return '';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function applyDateMask(val) {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }

  // Cálculo de IG pela DUM
  function calculateGestationalAgeByDum(dumDate, refDate = new Date()) {
    if (!dumDate) return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    const diffMs = refDate.getTime() - dumDate.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0 || diffDias > 310) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const semanas = Math.floor(diffDias / 7);
    const dias = diffDias % 7;
    const dppDate = new Date(dumDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    return {
      valid: true,
      semanas,
      dias,
      dpp: formatDateBR(dppDate),
      diasTotais: diffDias
    };
  }

  // Cálculo de IG pelo Exame Ultrassonográfico Inicial (Primeira Ultrassonografia)
  function calculateGestationalAgeByInitialExam(examDate, semAnt, diasAnt, refDate = new Date()) {
    if (!examDate || isNaN(semAnt) || semAnt <= 0) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const diffMs = refDate.getTime() - examDate.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0 || diffDias > 300) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const totalDiasAnt = (Number(semAnt) * 7) + (Number(diasAnt) || 0);
    const totalDiasAtual = totalDiasAnt + diffDias;
    const semanas = Math.floor(totalDiasAtual / 7);
    const dias = totalDiasAtual % 7;
    const diasRestantes = 280 - totalDiasAnt;
    const dppDate = new Date(examDate.getTime() + diasRestantes * 24 * 60 * 60 * 1000);

    return {
      valid: true,
      semanas,
      dias,
      dpp: formatDateBR(dppDate),
      diasTotais: totalDiasAtual
    };
  }

  // =========================================================================
  // 5. DATAÇÃO REFORMATADA: DETERMINAÇÃO DA IG DE REFERÊNCIA ÚNICA
  // =========================================================================

  function updateActiveGestationalAge() {
    const cron = state.cronologia;

    // Regra 1: Quando a paciente sabe a DUM e o usuário optou por usar a DUM como padrão
    if (cron.dumStatus === 'sim' && cron.dumPadrao) {
      if (cron.dumCalculada.valid) {
        cron.igAtiva = {
          semanas: cron.dumCalculada.semanas,
          dias: cron.dumCalculada.dias,
          metodo: 'dum',
          origemTexto: 'pela DUM',
          dpp: cron.dumCalculada.dpp
        };
      } else {
        // Aguardando preenchimento da DUM
        cron.igAtiva = {
          semanas: 28,
          dias: 0,
          metodo: 'dum',
          origemTexto: 'DUM pendente',
          dpp: ''
        };
      }
    } else {
      // Regra 2: DUM não utilizada como padrão (seja por NÃO, por DUM incerta ou não informada)
      if (cron.metodoAlternativo === 'primeira_usg') {
        if (cron.primeiraUsgCalculada.valid) {
          cron.igAtiva = {
            semanas: cron.primeiraUsgCalculada.semanas,
            dias: cron.primeiraUsgCalculada.dias,
            metodo: 'primeira_usg',
            origemTexto: 'segundo exame ultrassonográfico inicial',
            dpp: cron.primeiraUsgCalculada.dpp
          };
        } else {
          cron.igAtiva = {
            semanas: 28,
            dias: 0,
            metodo: 'primeira_usg',
            origemTexto: '1ª USG pendente',
            dpp: ''
          };
        }
      } else {
        // Opção B: Idade gestacional referida
        const sem = parseInt(cron.igReferidaSem, 10) || 28;
        const dias = parseInt(cron.igReferidaDias, 10) || 0;
        cron.igAtiva = {
          semanas: sem,
          dias: dias,
          metodo: 'referida',
          origemTexto: 'referida',
          dpp: ''
        };
      }
    }

    // Atualiza o display visual de destaque
    if (dom.displayIgVigente) {
      const { semanas, dias, origemTexto } = cron.igAtiva;
      dom.displayIgVigente.textContent = `${semanas} semanas e ${dias} dias (${origemTexto})`;
    }

    // Reavalia ILA e Biometria com base na semana atual de referência
    updateIlaReferenceBanner();
    checkIlaClassification();
    calculateBiometry();
    renderReportText();
  }

  // =========================================================================
  // 6. CÁLCULOS BIOMÉTRICOS FETAL (HADLOCK)
  // =========================================================================

  function calculateBiometry() {
    const dbp = parseFloat(state.biometria.dbp);
    const dof = parseFloat(state.biometria.dof);
    const cc  = parseFloat(state.biometria.cc);
    const ca  = parseFloat(state.biometria.ca);
    const cf  = parseFloat(state.biometria.cf);

    // 1. Índice CC/CA
    if (cc > 0 && ca > 0) {
      state.biometria.ccCa = (cc / ca).toFixed(2);
    } else {
      state.biometria.ccCa = null;
    }

    // 2. Índice Cefálico DBP/DOF (normal: 70 a 86%)
    if (dbp > 0 && dof > 0) {
      state.biometria.indiceCefalico = Math.round((dbp / dof) * 100);
    } else {
      state.biometria.indiceCefalico = null;
    }

    // 3. Estimativa de Peso Fetal (Hadlock 4 parâmetros: DBP, CC, CA, CF em cm)
    if (dbp > 0 && cc > 0 && ca > 0 && cf > 0) {
      const dbpCm = dbp / 10;
      const ccCm  = cc / 10;
      const caCm  = ca / 10;
      const cfCm  = cf / 10;

      const log10Peso = 1.3596 +
        (0.00061 * dbpCm * caCm) +
        (0.0424 * caCm) +
        (0.174 * cfCm) +
        (0.0064 * ccCm) -
        (0.00386 * caCm * cfCm);

      const pesoCalculado = Math.round(Math.pow(10, log10Peso));
      state.biometria.peso = pesoCalculado;

      // 4. Percentil de Peso Fetal de Hadlock pela IG Ativa
      const { semanas, dias } = state.cronologia.igAtiva;
      const MA = semanas + (dias / 7);

      if (MA >= 16 && MA <= 42) {
        const lnMediaG = 0.578 + (0.332 * MA) - (0.00354 * MA * MA);
        const z = (Math.log(pesoCalculado) - lnMediaG) / 0.13;
        state.biometria.percentil = zToPercentile(z);
      } else {
        state.biometria.percentil = null;
      }
    } else {
      state.biometria.peso = null;
      state.biometria.percentil = null;
    }

    // 5. Idade Gestacional Estimada pela Biometria Fetal
    calculateBiometricGestationalAge();
    updateBiometryDisplay();
  }

  function calculateBiometricGestationalAge() {
    const dbp = parseFloat(state.biometria.dbp);
    const cc  = parseFloat(state.biometria.cc);
    const ca  = parseFloat(state.biometria.ca);
    const cf  = parseFloat(state.biometria.cf);

    const gas = [];
    if (dbp > 15) {
      const dbpCm = dbp / 10;
      gas.push(9.54 + (1.482 * dbpCm) + (0.1676 * dbpCm * dbpCm));
    }
    if (cc > 50) {
      const ccCm = cc / 10;
      gas.push(8.96 + (0.540 * ccCm) + (0.0003 * ccCm * ccCm * ccCm));
    }
    if (ca > 50) {
      const caCm = ca / 10;
      gas.push(8.14 + (0.0753 * caCm) + (0.0036 * caCm * caCm));
    }
    if (cf > 10) {
      const cfCm = cf / 10;
      gas.push(10.35 + (2.460 * cfCm) + (0.170 * cfCm * cfCm));
    }

    if (gas.length > 0) {
      const mediaSemanas = gas.reduce((a, b) => a + b, 0) / gas.length;
      const semanas = Math.floor(mediaSemanas);
      const dias = Math.round((mediaSemanas - semanas) * 7);

      let margem = 14;
      if (semanas <= 20) margem = 10;
      else if (semanas >= 30) margem = 21;

      state.biometria.igBiometria = {
        valid: true,
        semanas,
        dias: dias === 7 ? 0 : dias,
        margemDias: margem
      };
      if (dias === 7) state.biometria.igBiometria.semanas += 1;
    } else {
      state.biometria.igBiometria = { valid: false, semanas: 0, dias: 0, margemDias: 14 };
    }
  }

  function updateBiometryDisplay() {
    if (dom.displayCcCa) {
      dom.displayCcCa.textContent = state.biometria.ccCa 
        ? `${state.biometria.ccCa} (normal)`
        : '—';
    }
    if (dom.displayDbfDof) {
      dom.displayDbfDof.textContent = state.biometria.indiceCefalico 
        ? `${state.biometria.indiceCefalico}% (normal: 70 a 86%)`
        : '—';
    }
    if (dom.displayPesoFetal) {
      dom.displayPesoFetal.textContent = state.biometria.peso 
        ? `${state.biometria.peso} g ± 10%`
        : '— g ± 10%';
    }
    if (dom.displayPercentilPeso) {
      if (state.biometria.percentil !== null) {
        dom.displayPercentilPeso.textContent = `p${state.biometria.percentil} de Hadlock`;
      } else {
        dom.displayPercentilPeso.textContent = '—';
      }
    }
    if (dom.displayIgBiometria) {
      if (state.biometria.igBiometria.valid) {
        const { semanas, dias, margemDias } = state.biometria.igBiometria;
        dom.displayIgBiometria.textContent = `${semanas} semanas e ${dias} dias (± ${margemDias} dias)`;
      } else {
        dom.displayIgBiometria.textContent = '—';
      }
    }
  }

  // =========================================================================
  // 7. LÍQUIDO AMNIÓTICO: REFERÊNCIA AUTOMÁTICA, ALERTA E CLASSIFICAÇÃO
  // =========================================================================

  function updateIlaReferenceBanner() {
    let sem = Math.round(state.cronologia.igAtiva.semanas);
    if (sem < 16) sem = 16;
    if (sem > 41) sem = 41;

    const ref = TABELA_ILA_REFERENCIA[sem];
    if (!ref || !dom.ilaRefTexto) return;

    if (sem <= 19) {
      dom.ilaRefTexto.textContent = `Para ${sem} semanas (16 a 19 semanas): apenas descrição de normalidade do maior bolsão vertical (20 a 80 mm), sem intervalo numérico de ILA.`;
    } else {
      dom.ilaRefTexto.textContent = `Referência do ILA para esta idade gestacional (${sem} semanas): ${ref.min}–${ref.max} mm.`;
    }
  }

  function checkIlaClassification() {
    const rawIla = state.liquido.ila;
    const rawMbv = state.liquido.maiorBolsao;

    // Se ambos os campos estiverem vazios, não classifica e oculta badges
    if ((rawIla === '' || rawIla === null) && (rawMbv === '' || rawMbv === null)) {
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
      if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      state.liquido.statusRef = 'aguardando';
      state.liquido.classificacao = 'normal';
      if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'normal';
      return;
    }

    let sem = Math.round(state.cronologia.igAtiva.semanas);
    if (sem < 16) sem = 16;
    if (sem > 41) sem = 41;

    const ref = TABELA_ILA_REFERENCIA[sem];

    // Para 20 a 41 semanas: avaliação primária pelo ILA
    if (sem >= 20 && rawIla !== '' && rawIla !== null && !isNaN(parseFloat(rawIla))) {
      const val = parseFloat(rawIla);
      const min = ref.min;
      const max = ref.max;

      if (val >= min && val <= max) {
        // Dentro da referência
        state.liquido.statusRef = 'normal';
        state.liquido.classificacao = 'normal';
        if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'normal';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'flex';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      } else if (val < min) {
        // Abaixo da referência
        state.liquido.statusRef = 'abaixo';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: ILA de ${val} mm está abaixo do limite de referência (${min}–${max} mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';

        // Sugere opção de redução se ainda estiver como 'normal' ou 'aumentado'
        if (state.liquido.classificacao === 'normal' || state.liquido.classificacao === 'aumentado' || state.liquido.classificacao === 'polidramnio') {
          state.liquido.classificacao = 'diminuido';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'diminuido';
        }
      } else {
        // Acima da referência
        state.liquido.statusRef = 'acima';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: ILA de ${val} mm está acima do limite de referência (${min}–${max} mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';

        // Sugere opção de aumento se ainda estiver como 'normal' ou 'diminuido'
        if (state.liquido.classificacao === 'normal' || state.liquido.classificacao === 'diminuido' || state.liquido.classificacao === 'oligoidramnio') {
          state.liquido.classificacao = 'aumentado';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'aumentado';
        }
      }
    } else if (sem <= 19 && rawMbv !== '' && rawMbv !== null && !isNaN(parseFloat(rawMbv))) {
      // Para 16 a 19 semanas: avaliação pelo maior bolsão vertical (20 a 80 mm)
      const mbv = parseFloat(rawMbv);
      if (mbv >= 20 && mbv <= 80) {
        state.liquido.statusRef = 'normal';
        state.liquido.classificacao = 'normal';
        if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'normal';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'flex';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      } else if (mbv < 20) {
        state.liquido.statusRef = 'abaixo';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: maior bolsão vertical de ${mbv} mm está abaixo do limite normal (20 a 80 mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';
        if (state.liquido.classificacao === 'normal') {
          state.liquido.classificacao = 'diminuido';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'diminuido';
        }
      } else {
        state.liquido.statusRef = 'acima';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: maior bolsão vertical de ${mbv} mm está acima do limite normal (20 a 80 mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';
        if (state.liquido.classificacao === 'normal') {
          state.liquido.classificacao = 'aumentado';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'aumentado';
        }
      }
    }
  }

  // =========================================================================
  // 8. GERAÇÃO DINÂMICA DO LAUDO (ESTRITA FIDELIDADE AOS MODELOS WORD)
  // =========================================================================

  function renderReportText() {
    if (state.isManualEdit) return;
    if (!dom.reportPaper) return;

    const p = [];
    const { semanas, dias, metodo } = state.cronologia.igAtiva;
    let sem = Math.round(semanas);
    if (sem < 16) sem = 16;
    if (sem > 41) sem = 41;

    // 1. TÍTULO PRINCIPAL CENTRALIZADO
    p.push(`<p class="report-title"><b>ULTRASSONOGRAFIA OBSTÉTRICA</b></p>`);
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 2. CRONOLOGIA GESTACIONAL (DUM E FRASE DE DATAÇÃO CONFORME MÉTODO)
    if (state.cronologia.dumStatus === 'sim' && state.cronologia.dum) {
      p.push(`<p>Data da última menstruação: ${state.cronologia.dum}</p>`);
    } else if (state.cronologia.dumStatus === 'incerta') {
      p.push(`<p>Data da última menstruação: incerta.</p>`);
    } else {
      p.push(`<p>Data da última menstruação: não informada.</p>`);
    }

    const semTxt = semanas ? `${semanas}` : 'X';
    const diasTxt = dias ? `${dias}` : '0';

    // Redação estrita conforme o método de datação selecionado:
    let fraseDatacao = '';
    if (metodo === 'dum') {
      fraseDatacao = `Exame ultrassonográfico realizado com ${semTxt} semanas e ${diasTxt} dias de idade gestacional segundo a data da última menstruação.`;
    } else if (metodo === 'primeira_usg') {
      // Exigência explícita: "Segundo exame ultrassonográfico inicial." (não usar "anterior")
      fraseDatacao = `Exame ultrassonográfico realizado com ${semTxt} semanas e ${diasTxt} dias de idade gestacional segundo exame ultrassonográfico inicial.`;
    } else {
      // Idade gestacional referida
      fraseDatacao = `Exame ultrassonográfico realizado com ${semTxt} semanas e ${diasTxt} dias de idade gestacional referida.`;
    }

    p.push(`<p>${fraseDatacao}</p>`);
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 3. ESTÁTICA FETAL E VITALIDADE (SEMPRE FETO ÚNICO)
    const sitTxt = state.estatica.situacao;
    const aprTxt = state.estatica.apresentacao;
    const dorsoTxt = state.estatica.dorso;

    p.push(`<p>Feto único, em situação ${sitTxt}, apresentação ${aprTxt} e dorso à ${dorsoTxt}.</p>`);

    if (state.estatica.movimentacao === 'ativa_normal') {
      p.push(`<p>Movimentação fetal ativa dentro dos padrões da normalidade.</p>`);
    } else if (state.estatica.movimentacao === 'presente_diminuida') {
      p.push(`<p>Movimentação fetal presente, porém diminuída durante o exame.</p>`);
    } else {
      p.push(`<p>Movimentação fetal não visibilizada no momento do exame.</p>`);
    }
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 4. PLACENTA E CORDÃO UMBILICAL
    p.push(`<p class="report-section-title"><b>PLACENTA E CORDÃO UMBILICAL</b></p>`);
    const placIns = state.placenta.insercao;
    const placGrau = state.placenta.grau;
    const placEsp = state.placenta.espessura ? formatNumBR(state.placenta.espessura, 0) : 'X';
    const oicFrase = state.placenta.longeDoOic ? ', não atingindo o orifício interno do colo uterino' : '';

    p.push(`<p>Placenta de inserção ${placIns}${oicFrase}. A ecogenicidade é de Grau ${placGrau}, segundo Grannum, medindo ${placEsp} mm de espessura.</p>`);

    if (state.placenta.cordao === 'tres_vasos') {
      p.push(`<p>Cordão umbilical constituído de três vasos, sem alterações.</p>`);
    } else if (state.placenta.cordao === 'arteria_unica') {
      p.push(`<p>Cordão umbilical constituído de dois vasos (artéria umbilical única).</p>`);
    } else {
      p.push(`<p>Cordão umbilical com laço circular cervical no momento do exame.</p>`);
    }
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 5. LÍQUIDO AMNIÓTICO (CONFORME REGRAS E TABELA MOORE)
    p.push(`<p class="report-section-title"><b>LÍQUIDO AMNIÓTICO</b></p>`);

    const classif = state.liquido.classificacao;
    if (classif === 'normal') {
      p.push(`<p>Volume de líquido amniótico normal para a idade gestacional.</p>`);
    } else if (classif === 'diminuido') {
      p.push(`<p>Volume de líquido amniótico no limite inferior da normalidade para a idade gestacional.</p>`);
    } else if (classif === 'oligoidramnio') {
      p.push(`<p>Volume de líquido amniótico acentuadamente diminuído (oligoidrâmnio).</p>`);
    } else if (classif === 'aumentado') {
      p.push(`<p>Volume de líquido amniótico no limite superior da normalidade para a idade gestacional.</p>`);
    } else if (classif === 'polidramnio') {
      p.push(`<p>Volume de líquido amniótico acentuadamente aumentado (polidrâmnio).</p>`);
    }

    const mbvVal = state.liquido.maiorBolsao !== '' && state.liquido.maiorBolsao !== null 
      ? formatNumBR(state.liquido.maiorBolsao, 0) 
      : 'X';
    const ilaVal = state.liquido.ila !== '' && state.liquido.ila !== null 
      ? formatNumBR(state.liquido.ila, 0) 
      : 'X';

    // Regra oficial:
    // 16 a 19 semanas: sem intervalo numérico de ILA, apenas maior bolsão
    // 20 a 41 semanas: ILA com intervalo numérico exato da tabela + maior bolsão + citação Moore
    if (sem <= 19) {
      p.push(`<p>O maior bolsão vertical mede ${mbvVal} mm (normal de 20 a 80 mm).</p>`);
    } else {
      const refIla = TABELA_ILA_REFERENCIA[sem];
      const minIla = refIla ? refIla.min : 90;
      const maxIla = refIla ? refIla.max : 230;
      p.push(`<p>ILA: ${ilaVal} mm (normal para a idade gestacional de ${minIla} a ${maxIla} mm)* e maior bolsão vertical de ${mbvVal} mm.</p>`);
      p.push(`<p class="report-note">*Moore TR, Cayle JE. Am J Obstet Gynecol. 1990 May;162(5):1168-73.</p>`);
    }
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 6. MORFOLOGIA FETAL BÁSICA E BCF
    p.push(`<p class="report-section-title"><b>MORFOLOGIA FETAL</b></p>`);
    p.push(`<p>Polo cefálico: calota craniana normoecogênica. Foice cerebral e plexos coróides identificados e de aspecto aparentemente normal.</p>`);

    const fcfVal = state.bcf ? state.bcf : 'X';
    p.push(`<p>Tórax: coração identificado e normoposicionado. FCF: ${fcfVal} bpm.</p>`);
    p.push(`<p>Abdome: foram visibilizados o estômago e a bexiga.</p>`);
    p.push(`<p>Membros: esqueleto apendicular com ecogenicidade adequada para a idade gestacional. Não se observam alterações grosseiras.</p>`);
    p.push(`<p>Coluna vertebral: todos os segmentos identificados e sem alterações detectáveis nesta idade gestacional.</p>`);

    if (!state.morfologia.padrao && state.morfologia.obs) {
      p.push(`<p>Observações morfológicas adicionais: ${state.morfologia.obs}</p>`);
    }
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 7. BIOMETRIA FETAL E ÍNDICES
    p.push(`<p class="report-section-title"><b>BIOMETRIA FETAL</b></p>`);
    const dbpTxt = state.biometria.dbp ? formatNumBR(state.biometria.dbp, 0) : 'X';
    const dofTxt = state.biometria.dof ? formatNumBR(state.biometria.dof, 0) : 'X';
    const ccTxt  = state.biometria.cc  ? formatNumBR(state.biometria.cc, 0)  : 'X';
    const caTxt  = state.biometria.ca  ? formatNumBR(state.biometria.ca, 0)  : 'X';
    const cfTxt  = state.biometria.cf  ? formatNumBR(state.biometria.cf, 0)  : 'X';
    const cuTxt  = state.biometria.cu  ? formatNumBR(state.biometria.cu, 0)  : 'X';
    const ccCaTxt = state.biometria.ccCa ? state.biometria.ccCa : 'X';
    const cefTxt = state.biometria.indiceCefalico ? state.biometria.indiceCefalico : 'X';
    const pesoTxt = state.biometria.peso ? formatNumBR(state.biometria.peso, 0) : 'X';

    p.push(`<p>Diâmetro biparietal (DBP): ${dbpTxt} mm.</p>`);
    p.push(`<p>Diâmetro occipitofrontal (DOF): ${dofTxt} mm.</p>`);
    p.push(`<p>Circunferência craniana (CC): ${ccTxt} mm.</p>`);
    p.push(`<p>Circunferência abdominal (CA): ${caTxt} mm.</p>`);
    p.push(`<p>Comprimento do fêmur (CF): ${cfTxt} mm.</p>`);
    p.push(`<p>Comprimento do úmero (CU): ${cuTxt} mm.</p>`);
    p.push(`<p>Índice CC/CA: ${ccCaTxt} (normal para idade gestacional).</p>`);
    p.push(`<p>Índice cefálico DBP/DOF:  ${cefTxt} (normal: 70 a 86).</p>`);
    p.push(`<p>Peso fetal estimado: ${pesoTxt} g +/- 10%.</p>`);
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // 8. CONCLUSÃO DINÂMICA
    p.push(`<p class="report-section-title"><b>CONCLUSÃO</b></p>`);

    // Linha 1 da conclusão: IG Biometria + Compatibilidade com Método Ativo
    const igBioSem = state.biometria.igBiometria.valid ? state.biometria.igBiometria.semanas : semTxt;
    const igBioDias = state.biometria.igBiometria.valid ? state.biometria.igBiometria.dias : diasTxt;
    const margemDias = state.biometria.igBiometria.valid ? state.biometria.igBiometria.margemDias : 14;

    const refSemTxt = semTxt;
    const refDiasTxt = diasTxt;

    let percentilFrase = '';
    if (state.biometria.percentil !== null) {
      percentilFrase = ` (percentil ${state.biometria.percentil} de Hadlock)`;
    }

    let desenvTxt = 'com adequado desenvolvimento fetal';
    if (state.conclusao.crescimento === 'restricao') {
      desenvTxt = 'com restrição de crescimento fetal';
    } else if (state.conclusao.crescimento === 'macrossomia') {
      desenvTxt = 'com padrão de macrossomia fetal';
    } else if (state.conclusao.crescimento === 'pigm') {
      desenvTxt = 'com feto pequeno para a idade gestacional';
    } else if (state.conclusao.crescimento === 'gigm') {
      desenvTxt = 'com feto grande para a idade gestacional';
    }

    let compatibilidadeFrase = '';
    if (metodo === 'dum') {
      compatibilidadeFrase = `Compatível com ${refSemTxt} semanas e ${refDiasTxt} dias de idade gestacional estimada pela DUM, ${desenvTxt}${percentilFrase}.`;
    } else if (metodo === 'primeira_usg') {
      compatibilidadeFrase = `Compatível com ${refSemTxt} semanas e ${refDiasTxt} dias de idade gestacional estimada segundo exame ultrassonográfico inicial, ${desenvTxt}${percentilFrase}.`;
    } else {
      compatibilidadeFrase = `Compatível com ${refSemTxt} semanas e ${refDiasTxt} dias de idade gestacional referida, ${desenvTxt}${percentilFrase}.`;
    }

    p.push(`<p>- Gestação tópica, com idade gestacional estimada pela biometria do presente exame em ${igBioSem} semanas e ${igBioDias} dias (+/- ${margemDias} dias). ${compatibilidadeFrase}</p>`);
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // Linha 2 da conclusão: Movimentação fetal
    if (state.conclusao.vitalidade === 'adequada') {
      p.push(`<p>- Movimentação fetal adequada.</p>`);
    } else {
      p.push(`<p>- Movimentação fetal reduzida durante o exame.</p>`);
    }
    p.push(`<p class="report-blank-line">&nbsp;</p>`);

    // Linha 3 da conclusão: Reflexo direto da classificação do Líquido Amniótico
    if (classif === 'normal') {
      p.push(`<p>- Volume de líquido amniótico normal.</p>`);
    } else if (classif === 'diminuido') {
      p.push(`<p>- Volume de líquido amniótico no limite inferior da normalidade.</p>`);
    } else if (classif === 'oligoidramnio') {
      p.push(`<p>- Volume de líquido amniótico diminuído (oligoidrâmnio).</p>`);
    } else if (classif === 'aumentado') {
      p.push(`<p>- Volume de líquido amniótico no limite superior da normalidade.</p>`);
    } else if (classif === 'polidramnio') {
      p.push(`<p>- Volume de líquido amniótico aumentado (polidrâmnio).</p>`);
    }

    // Observações adicionais na conclusão se informadas
    if (state.conclusao.obs && state.conclusao.obs.trim()) {
      p.push(`<p class="report-blank-line">&nbsp;</p>`);
      p.push(`<p>- ${state.conclusao.obs.trim()}</p>`);
    }

    // 9. NOTA MÉDICA PADRONIZADA FINAL
    if (state.conclusao.notaFinal) {
      p.push(`<p class="report-blank-line">&nbsp;</p>`);
      p.push(`<p class="report-note">Nota: O principal objetivo do ultrassom obstétrico é avaliar o crescimento e a vitalidade fetal. Não tem finalidade de rastreamento e diagnóstico de doenças genéticas e/ou malformações fetais. Fatores como biotipo materno, posição fetal e volume de líquido amniótico podem limitar a visibilização de algumas estruturas. A normalidade deste exame não exclui a totalidade de alterações estruturais ou genéticas.</p>`);
    }

    dom.reportPaper.innerHTML = p.join('\n');
  }

  // =========================================================================
  // 9. CÓPIA RICA PARA CLIPBOARD (PRESERVA FORMATAÇÃO EXATA NO WORD)
  // =========================================================================

  async function copyReportRichText() {
    if (!dom.reportPaper) return;

    let richHtml = dom.reportPaper.innerHTML;

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
  margin-bottom: 0pt;
  mso-para-margin-bottom: 0pt;
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
  margin-top: 0pt;
  margin-bottom: 0pt;
  mso-para-margin-top: 0pt;
  mso-para-margin-bottom: 0pt;
}
.report-note {
  font-size: 10pt;
  color: #1a1a1a;
  margin-top: 0pt;
  mso-para-margin-top: 0pt;
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
        console.warn('ClipboardItem fallback:', err);
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
  // 10. SINCRONIZAÇÃO E RESET PARA VALORES PADRÃO LIMPOS
  // =========================================================================

  function resetToDefault() {
    state.isManualEdit = false;
    if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'none';
    if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';

    // Cronologia limpa
    state.cronologia.dumStatus = 'sim';
    state.cronologia.dum = '';
    state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    state.cronologia.dumPadrao = true;
    state.cronologia.metodoAlternativo = 'primeira_usg';
    state.cronologia.primeiraUsgData = '';
    state.cronologia.primeiraUsgSem = '';
    state.cronologia.primeiraUsgDias = '';
    state.cronologia.primeiraUsgCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    state.cronologia.igReferidaSem = 28;
    state.cronologia.igReferidaDias = 0;
    state.cronologia.igAtiva = { semanas: 28, dias: 0, metodo: 'dum', origemTexto: 'pela DUM', dpp: '' };
    // Estática (Gestação única exclusiva)
    state.estatica.situacao = 'longitudinal';
    state.estatica.apresentacao = 'cefalica';
    state.estatica.dorso = 'direita';
    state.estatica.movimentacao = 'ativa_normal';

    // BCF limpo
    state.bcf = '';

    // Placenta padrão
    state.placenta.insercao = 'corporal anterior';
    state.placenta.grau = 'I';
    state.placenta.espessura = '';
    state.placenta.longeDoOic = true;
    state.placenta.cordao = 'tres_vasos';

    // Líquido amniótico estritamente VAZIO (sem valores fictícios)
    state.liquido.ila = '';
    state.liquido.maiorBolsao = '';
    state.liquido.classificacao = 'normal';
    state.liquido.statusRef = 'aguardando';

    // Morfologia padrão
    state.morfologia.padrao = true;
    state.morfologia.obs = '';

    // Biometria limpa
    state.biometria.dbp = '';
    state.biometria.dof = '';
    state.biometria.cc = '';
    state.biometria.ca = '';
    state.biometria.cf = '';
    state.biometria.cu = '';
    state.biometria.ccCa = null;
    state.biometria.indiceCefalico = null;
    state.biometria.peso = null;
    state.biometria.percentil = null;
    state.biometria.igBiometria = { valid: false, semanas: 0, dias: 0, margemDias: 14 };

    // Conclusão padrão
    state.conclusao.crescimento = 'adequado';
    state.conclusao.vitalidade = 'adequada';
    state.conclusao.obs = '';
    state.conclusao.notaFinal = true;

    syncDomFromState();
    updateActiveGestationalAge();
  }

  function syncDomFromState() {
    const cron = state.cronologia;

    // Cronologia DUM
    if (dom.selDumStatus) dom.selDumStatus.value = cron.dumStatus;
    if (dom.inputDum) dom.inputDum.value = cron.dum;
    if (dom.containerDum) dom.containerDum.style.display = cron.dumStatus === 'sim' ? 'block' : 'none';

    if (dom.btnDumPadraoSim && dom.btnDumPadraoNao) {
      dom.btnDumPadraoSim.classList.toggle('active', cron.dumPadrao);
      dom.btnDumPadraoNao.classList.toggle('active', !cron.dumPadrao);
    }

    // Container Alternativo
    const mostrarAlternativo = cron.dumStatus !== 'sim' || !cron.dumPadrao;
    if (dom.containerDatacaoAlternativa) {
      dom.containerDatacaoAlternativa.style.display = mostrarAlternativo ? 'block' : 'none';
    }

    if (dom.btnMetodoPrimeiraUsg && dom.btnMetodoReferida) {
      dom.btnMetodoPrimeiraUsg.classList.toggle('active', cron.metodoAlternativo === 'primeira_usg');
      dom.btnMetodoReferida.classList.toggle('active', cron.metodoAlternativo === 'referida');
    }

    if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = cron.metodoAlternativo === 'primeira_usg' ? 'block' : 'none';
    if (dom.panelIgReferida) dom.panelIgReferida.style.display = cron.metodoAlternativo === 'referida' ? 'block' : 'none';

    if (dom.inputPrimeiraUsgData) dom.inputPrimeiraUsgData.value = cron.primeiraUsgData;
    if (dom.inputPrimeiraUsgSem) dom.inputPrimeiraUsgSem.value = cron.primeiraUsgSem;
    if (dom.inputPrimeiraUsgDias) dom.inputPrimeiraUsgDias.value = cron.primeiraUsgDias;

    if (dom.inputIgReferidaSem) dom.inputIgReferidaSem.value = cron.igReferidaSem;
    if (dom.inputIgReferidaDias) dom.inputIgReferidaDias.value = cron.igReferidaDias;


    // Estática
    if (dom.selSituacao) dom.selSituacao.value = state.estatica.situacao;
    if (dom.selApresentacao) dom.selApresentacao.value = state.estatica.apresentacao;
    if (dom.selDorso) dom.selDorso.value = state.estatica.dorso;
    if (dom.selMovimentacao) dom.selMovimentacao.value = state.estatica.movimentacao;

    // BCF
    if (dom.inputFcf) dom.inputFcf.value = state.bcf;

    // Placenta
    if (dom.selPlacentaInsercao) dom.selPlacentaInsercao.value = state.placenta.insercao;
    if (dom.selPlacentaGrau) dom.selPlacentaGrau.value = state.placenta.grau;
    if (dom.inputPlacentaEspessura) dom.inputPlacentaEspessura.value = state.placenta.espessura;
    if (dom.btnPlacentaDistanteSim && dom.btnPlacentaDistanteNao) {
      dom.btnPlacentaDistanteSim.classList.toggle('active', state.placenta.longeDoOic);
      dom.btnPlacentaDistanteNao.classList.toggle('active', !state.placenta.longeDoOic);
    }
    if (dom.selCordao) dom.selCordao.value = state.placenta.cordao;

    // Líquido Amniótico (limpos)
    if (dom.inputIla) dom.inputIla.value = state.liquido.ila;
    if (dom.inputMaiorBolsao) dom.inputMaiorBolsao.value = state.liquido.maiorBolsao;
    if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = state.liquido.classificacao;

    // Morfologia
    if (dom.btnMorfoPadrao && dom.btnMorfoPersonalizada) {
      dom.btnMorfoPadrao.classList.toggle('active', state.morfologia.padrao);
      dom.btnMorfoPersonalizada.classList.toggle('active', !state.morfologia.padrao);
    }
    if (dom.morfoPadraoInfo) dom.morfoPadraoInfo.style.display = state.morfologia.padrao ? 'flex' : 'none';
    if (dom.morfoPersonalizadaPanel) dom.morfoPersonalizadaPanel.style.display = state.morfologia.padrao ? 'none' : 'block';
    if (dom.inputMorfoObs) dom.inputMorfoObs.value = state.morfologia.obs;

    // Biometria
    if (dom.inputDbp) dom.inputDbp.value = state.biometria.dbp;
    if (dom.inputDof) dom.inputDof.value = state.biometria.dof;
    if (dom.inputCc) dom.inputCc.value = state.biometria.cc;
    if (dom.inputCa) dom.inputCa.value = state.biometria.ca;
    if (dom.inputCf) dom.inputCf.value = state.biometria.cf;
    if (dom.inputCu) dom.inputCu.value = state.biometria.cu;

    // Conclusão
    if (dom.selConclusaoCrescimento) dom.selConclusaoCrescimento.value = state.conclusao.crescimento;
    if (dom.selConclusaoVitalidade) dom.selConclusaoVitalidade.value = state.conclusao.vitalidade;
    if (dom.inputConclusaoObs) dom.inputConclusaoObs.value = state.conclusao.obs;
    if (dom.btnNotaFinalSim && dom.btnNotaFinalNao) {
      dom.btnNotaFinalSim.classList.toggle('active', state.conclusao.notaFinal);
      dom.btnNotaFinalNao.classList.toggle('active', !state.conclusao.notaFinal);
    }
  }

  // =========================================================================
  // 11. INICIALIZAÇÃO DE EVENTOS
  // =========================================================================

  function initEvents() {
    // Tema claro / escuro
    if (dom.themeToggleBtn) {
      dom.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Cronologia: DUM
    if (dom.selDumStatus) {
      dom.selDumStatus.addEventListener('change', () => {
        state.cronologia.dumStatus = dom.selDumStatus.value;
        const sabeDum = state.cronologia.dumStatus === 'sim';
        if (dom.containerDum) dom.containerDum.style.display = sabeDum ? 'block' : 'none';

        if (!sabeDum) {
          state.cronologia.dum = '';
          state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
          if (dom.dumFeedbackBox) dom.dumFeedbackBox.style.display = 'none';
        }

        // Se sabe DUM e DUM padrão for SIM, esconde o alternativo. Caso contrário, mostra.
        const mostrarAlternativo = !sabeDum || !state.cronologia.dumPadrao;
        if (dom.containerDatacaoAlternativa) {
          dom.containerDatacaoAlternativa.style.display = mostrarAlternativo ? 'block' : 'none';
        }

        updateActiveGestationalAge();
      });
    }

    if (dom.inputDum) {
      dom.inputDum.addEventListener('input', (e) => {
        e.target.value = applyDateMask(e.target.value);
        state.cronologia.dum = e.target.value;
        const parsed = parseDateBR(state.cronologia.dum);
        if (parsed) {
          state.cronologia.dumCalculada = calculateGestationalAgeByDum(parsed);
          if (state.cronologia.dumCalculada.valid) {
            dom.dumIgDisplay.textContent = `${state.cronologia.dumCalculada.semanas} sem e ${state.cronologia.dumCalculada.dias} dias (DPP: ${state.cronologia.dumCalculada.dpp})`;
            dom.dumFeedbackBox.style.display = 'flex';
          } else {
            dom.dumFeedbackBox.style.display = 'none';
          }
        } else {
          state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
          dom.dumFeedbackBox.style.display = 'none';
        }
        updateActiveGestationalAge();
      });
    }

    // Toggle: Usar data da DUM como idade gestacional padrão?
    if (dom.btnDumPadraoSim) {
      dom.btnDumPadraoSim.addEventListener('click', () => {
        state.cronologia.dumPadrao = true;
        dom.btnDumPadraoSim.classList.add('active');
        dom.btnDumPadraoNao.classList.remove('active');
        if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'none';
        updateActiveGestationalAge();
      });
    }

    if (dom.btnDumPadraoNao) {
      dom.btnDumPadraoNao.addEventListener('click', () => {
        state.cronologia.dumPadrao = false;
        dom.btnDumPadraoSim.classList.remove('active');
        dom.btnDumPadraoNao.classList.add('active');
        if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'block';
        updateActiveGestationalAge();
      });
    }

    // Seletor de Método Alternativo: 1ª USG vs IG Referida
    if (dom.btnMetodoPrimeiraUsg) {
      dom.btnMetodoPrimeiraUsg.addEventListener('click', () => {
        state.cronologia.metodoAlternativo = 'primeira_usg';
        dom.btnMetodoPrimeiraUsg.classList.add('active');
        dom.btnMetodoReferida.classList.remove('active');
        if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'block';
        if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'none';
        updateActiveGestationalAge();
      });
    }

    if (dom.btnMetodoReferida) {
      dom.btnMetodoReferida.addEventListener('click', () => {
        state.cronologia.metodoAlternativo = 'referida';
        dom.btnMetodoPrimeiraUsg.classList.remove('active');
        dom.btnMetodoReferida.classList.add('active');
        if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'none';
        if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'block';
        updateActiveGestationalAge();
      });
    }

    // Opção A: Primeira Ultrassonografia
    const triggerPrimeiraUsgCalc = () => {
      const dt = parseDateBR(dom.inputPrimeiraUsgData.value);
      const sem = parseInt(dom.inputPrimeiraUsgSem.value, 10);
      const dias = parseInt(dom.inputPrimeiraUsgDias.value, 10) || 0;
      state.cronologia.primeiraUsgData = dom.inputPrimeiraUsgData.value;
      state.cronologia.primeiraUsgSem = dom.inputPrimeiraUsgSem.value;
      state.cronologia.primeiraUsgDias = dom.inputPrimeiraUsgDias.value;

      if (dt && !isNaN(sem)) {
        state.cronologia.primeiraUsgCalculada = calculateGestationalAgeByInitialExam(dt, sem, dias);
        if (state.cronologia.primeiraUsgCalculada.valid) {
          dom.primeiraUsgIgDisplay.textContent = `${state.cronologia.primeiraUsgCalculada.semanas} sem e ${state.cronologia.primeiraUsgCalculada.dias} dias (DPP: ${state.cronologia.primeiraUsgCalculada.dpp})`;
          dom.primeiraUsgFeedbackBox.style.display = 'flex';
        } else {
          dom.primeiraUsgFeedbackBox.style.display = 'none';
        }
      } else {
        dom.primeiraUsgFeedbackBox.style.display = 'none';
      }
      updateActiveGestationalAge();
    };

    if (dom.inputPrimeiraUsgData) {
      dom.inputPrimeiraUsgData.addEventListener('input', (e) => {
        e.target.value = applyDateMask(e.target.value);
        triggerPrimeiraUsgCalc();
      });
    }
    if (dom.inputPrimeiraUsgSem) dom.inputPrimeiraUsgSem.addEventListener('input', triggerPrimeiraUsgCalc);
    if (dom.inputPrimeiraUsgDias) dom.inputPrimeiraUsgDias.addEventListener('input', triggerPrimeiraUsgCalc);

    // Opção B: IG Referida
    if (dom.inputIgReferidaSem) {
      dom.inputIgReferidaSem.addEventListener('input', () => {
        state.cronologia.igReferidaSem = parseInt(dom.inputIgReferidaSem.value, 10) || 28;
        updateActiveGestationalAge();
      });
    }
    if (dom.inputIgReferidaDias) {
      dom.inputIgReferidaDias.addEventListener('input', () => {
        state.cronologia.igReferidaDias = parseInt(dom.inputIgReferidaDias.value, 10) || 0;
        updateActiveGestationalAge();
      });
    }


    // Estática (Gestação Única)
    if (dom.selSituacao) dom.selSituacao.addEventListener('change', () => { state.estatica.situacao = dom.selSituacao.value; renderReportText(); });
    if (dom.selApresentacao) dom.selApresentacao.addEventListener('change', () => { state.estatica.apresentacao = dom.selApresentacao.value; renderReportText(); });
    if (dom.selDorso) dom.selDorso.addEventListener('change', () => { state.estatica.dorso = dom.selDorso.value; renderReportText(); });
    if (dom.selMovimentacao) dom.selMovimentacao.addEventListener('change', () => { state.estatica.movimentacao = dom.selMovimentacao.value; renderReportText(); });

    // BCF (Seção Própria Independente)
    if (dom.inputFcf) {
      dom.inputFcf.addEventListener('input', () => {
        state.bcf = dom.inputFcf.value;
        renderReportText();
      });
    }

    // Placenta
    if (dom.selPlacentaInsercao) dom.selPlacentaInsercao.addEventListener('change', () => { state.placenta.insercao = dom.selPlacentaInsercao.value; renderReportText(); });
    if (dom.selPlacentaGrau) dom.selPlacentaGrau.addEventListener('change', () => { state.placenta.grau = dom.selPlacentaGrau.value; renderReportText(); });
    if (dom.inputPlacentaEspessura) dom.inputPlacentaEspessura.addEventListener('input', () => { state.placenta.espessura = dom.inputPlacentaEspessura.value; renderReportText(); });
    if (dom.btnPlacentaDistanteSim) {
      dom.btnPlacentaDistanteSim.addEventListener('click', () => {
        state.placenta.longeDoOic = true;
        dom.btnPlacentaDistanteSim.classList.add('active');
        dom.btnPlacentaDistanteNao.classList.remove('active');
        renderReportText();
      });
    }
    if (dom.btnPlacentaDistanteNao) {
      dom.btnPlacentaDistanteNao.addEventListener('click', () => {
        state.placenta.longeDoOic = false;
        dom.btnPlacentaDistanteSim.classList.remove('active');
        dom.btnPlacentaDistanteNao.classList.add('active');
        renderReportText();
      });
    }
    if (dom.selCordao) dom.selCordao.addEventListener('change', () => { state.placenta.cordao = dom.selCordao.value; renderReportText(); });

    // Líquido Amniótico (Apenas ILA e Maior Bolsão)
    if (dom.inputIla) {
      dom.inputIla.addEventListener('input', () => {
        state.liquido.ila = dom.inputIla.value;
        checkIlaClassification();
        renderReportText();
      });
    }
    if (dom.inputMaiorBolsao) {
      dom.inputMaiorBolsao.addEventListener('input', () => {
        state.liquido.maiorBolsao = dom.inputMaiorBolsao.value;
        checkIlaClassification();
        renderReportText();
      });
    }
    if (dom.selIlaClassificacao) {
      dom.selIlaClassificacao.addEventListener('change', () => {
        state.liquido.classificacao = dom.selIlaClassificacao.value;
        renderReportText();
      });
    }

    // Morfologia
    if (dom.btnMorfoPadrao) {
      dom.btnMorfoPadrao.addEventListener('click', () => {
        state.morfologia.padrao = true;
        dom.btnMorfoPadrao.classList.add('active');
        dom.btnMorfoPersonalizada.classList.remove('active');
        dom.morfoPadraoInfo.style.display = 'flex';
        dom.morfoPersonalizadaPanel.style.display = 'none';
        renderReportText();
      });
    }
    if (dom.btnMorfoPersonalizada) {
      dom.btnMorfoPersonalizada.addEventListener('click', () => {
        state.morfologia.padrao = false;
        dom.btnMorfoPadrao.classList.remove('active');
        dom.btnMorfoPersonalizada.classList.add('active');
        dom.morfoPadraoInfo.style.display = 'none';
        dom.morfoPersonalizadaPanel.style.display = 'block';
        renderReportText();
      });
    }
    if (dom.inputMorfoObs) dom.inputMorfoObs.addEventListener('input', () => { state.morfologia.obs = dom.inputMorfoObs.value; renderReportText(); });

    // Biometria
    const biometriaInputs = [
      { el: dom.inputDbp, key: 'dbp' },
      { el: dom.inputDof, key: 'dof' },
      { el: dom.inputCc,  key: 'cc' },
      { el: dom.inputCa,  key: 'ca' },
      { el: dom.inputCf,  key: 'cf' },
      { el: dom.inputCu,  key: 'cu' }
    ];

    biometriaInputs.forEach(item => {
      if (item.el) {
        item.el.addEventListener('input', () => {
          state.biometria[item.key] = item.el.value;
          calculateBiometry();
          renderReportText();
        });
      }
    });

    // Conclusão
    if (dom.selConclusaoCrescimento) dom.selConclusaoCrescimento.addEventListener('change', () => { state.conclusao.crescimento = dom.selConclusaoCrescimento.value; renderReportText(); });
    if (dom.selConclusaoVitalidade) dom.selConclusaoVitalidade.addEventListener('change', () => { state.conclusao.vitalidade = dom.selConclusaoVitalidade.value; renderReportText(); });
    if (dom.inputConclusaoObs) dom.inputConclusaoObs.addEventListener('input', () => { state.conclusao.obs = dom.inputConclusaoObs.value; renderReportText(); });
    if (dom.btnNotaFinalSim) {
      dom.btnNotaFinalSim.addEventListener('click', () => {
        state.conclusao.notaFinal = true;
        dom.btnNotaFinalSim.classList.add('active');
        dom.btnNotaFinalNao.classList.remove('active');
        renderReportText();
      });
    }
    if (dom.btnNotaFinalNao) {
      dom.btnNotaFinalNao.addEventListener('click', () => {
        state.conclusao.notaFinal = false;
        dom.btnNotaFinalSim.classList.remove('active');
        dom.btnNotaFinalNao.classList.add('active');
        renderReportText();
      });
    }

    // Edição manual do laudo
    if (dom.reportPaper) {
      dom.reportPaper.addEventListener('input', () => {
        if (!state.isManualEdit) {
          state.isManualEdit = true;
          if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'inline-block';
          if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'inline-flex';
          if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Edição Manual Ativa';
        }
      });
    }

    // Restaurar Laudo Dinâmico
    if (dom.btnRestaurarLaudo) {
      dom.btnRestaurarLaudo.addEventListener('click', () => {
        state.isManualEdit = false;
        if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'none';
        if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
        if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';
        renderReportText();
        showToast('Laudo restaurado e sincronizado com os dados do formulário.');
      });
    }

    // Copiar Laudo (Rich Text)
    if (dom.btnCopiarLaudo) dom.btnCopiarLaudo.addEventListener('click', copyReportRichText);

    // Imprimir
    if (dom.btnImprimir) dom.btnImprimir.addEventListener('click', () => window.print());

    // Modal de Novo Exame
    if (dom.btnNovoExame) {
      dom.btnNovoExame.addEventListener('click', () => {
        if (dom.modalNovoExame) dom.modalNovoExame.classList.add('active');
      });
    }
    if (dom.btnModalCancel) {
      dom.btnModalCancel.addEventListener('click', () => {
        if (dom.modalNovoExame) dom.modalNovoExame.classList.remove('active');
      });
    }
    if (dom.btnModalConfirm) {
      dom.btnModalConfirm.addEventListener('click', () => {
        if (dom.modalNovoExame) dom.modalNovoExame.classList.remove('active');
        resetToDefault();
        showToast('Novo exame iniciado com sucesso!');
      });
    }
  }

  // =========================================================================
  // 12. CONTROLE DE TEMA (CLARO / ESCURO)
  // =========================================================================

  function initTheme() {
    const savedTheme = localStorage.getItem('meuultrassom_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      if (dom.themeIconSun) dom.themeIconSun.style.display = 'block';
      if (dom.themeIconMoon) dom.themeIconMoon.style.display = 'none';
    } else {
      document.body.classList.remove('dark-mode');
      if (dom.themeIconSun) dom.themeIconSun.style.display = 'none';
      if (dom.themeIconMoon) dom.themeIconMoon.style.display = 'block';
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('meuultrassom_theme', isDark ? 'dark' : 'light');
    if (dom.themeIconSun) dom.themeIconSun.style.display = isDark ? 'block' : 'none';
    if (dom.themeIconMoon) dom.themeIconMoon.style.display = isDark ? 'none' : 'block';
  }

  // =========================================================================
  // 13. INICIALIZAÇÃO DO MÓDULO
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    initDom();
    initTheme();
    resetToDefault();
    initEvents();
  });

  // Exportação para escopo controlado se necessário para testes manuais
  window.meuultrassomSimples = {
    state,
    calculateBiometry,
    renderReportText,
    resetToDefault,
    copyReportRichText
  };

})();
