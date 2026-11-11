/**
 * MEUULTRASSOM — MÓDULO OBSTÉTRICO COM DOPPLER (16 A 41 SEMANAS)
 * Script Principal 100% Independente
 * 
 * Responsabilidades:
 * - Controle de tema claro/escuro persistente
 * - Gestão reativa de estado: Cronologia (DUM, 1ª USG, IG Referida), Estática, BCF, Placenta, Líquido (ILA/MBV), Morfologia, Biometria, Dopplerfluxometria e Conclusão
 * - Validação obrigatória do tipo de exame (tipoExame === 'doppler') no sessionStorage
 * - Validação estrita da semana ativa (16 a 41 semanas, número inteiro válido)
 * - Eliminação total de substituições silenciosas (sem fallbacks ou strings vazias mascarando referências ausentes)
 * - Validação centralizada e bloqueio explícito caso qualquer referência oficial esteja indisponível
 * - Tabelas de referência oficiais dos 26 documentos Word:
 *     * A. Uterinas IP Médio (Gómez O, et al. 2008) — 16 a 41 semanas
 *     * A. Umbilical IR (Kofinas AD, et al. 1992) — 16 a 19 semanas
 *     * A. Umbilical IP (Ciobanu A, et al. 2019) — 20 a 41 semanas
 *     * A. Cerebral Média IP (Ciobanu A, et al. 2019) — 20 a 41 semanas
 *     * Relação Cerebroplacentária RCP (Ciobanu A, et al. 2019) — 20 a 41 semanas
 *     * ILA (Moore TR, et al. 1990) — 20 a 41 semanas
 * - Adaptação dinâmica de estrutura para Semanas 16-19, 20-40 e 41
 * - Fórmulas biométricas Hadlock (Peso fetal, percentil e índices CC/CA e DBP/DOF)
 * - Renderização em tempo real na folha A4 com estrita fidelidade aos 26 modelos Word oficiais
 * - Sistema inteligente de sincronização com suporte a slots dinâmicos e preservação de edições manuais
 * - Cópia rica para o Microsoft Word preservando 100% da formatação e tabelas
 * - Botão e modal de novo exame e integração via sessionStorage ('meuultrassom_nav_data')
 */

(function() {
  'use strict';

  // =========================================================================
  // 1. TABELAS DE REFERÊNCIA OFICIAIS (16 A 41 SEMANAS)
  // =========================================================================

  // ILA — Moore TR, Cayle JE. Am J Obstet Gynecol. 1990 May;162(5):1168-73.
  const TABELA_ILA_REFERENCIA = {
    16: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    17: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    18: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    19: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    20: { min: 93, max: 212 },
    21: { min: 95, max: 214 },
    22: { min: 97, max: 216 },
    23: { min: 98, max: 218 },
    24: { min: 98, max: 219 },
    25: { min: 97, max: 221 },
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

  // IP Médio das Artérias Uterinas — Gómez O, et al. Ultrasound Obstet Gynecol. 2008
  // Limite superior de normalidade (< valor)
  const TABELA_IP_UTERINAS = {
    16: '1,99', 17: '1,88', 18: '1,79', 19: '1,70', 20: '1,61',
    21: '1,54', 22: '1,47', 23: '1,41', 24: '1,35', 25: '1,30',
    26: '1,25', 27: '1,21', 28: '1,17', 29: '1,13', 30: '1,10',
    31: '1,06', 32: '1,04', 33: '1,01', 34: '0,99', 35: '0,97',
    36: '0,95', 37: '0,94', 38: '0,92', 39: '0,91', 40: '0,90',
    41: '0,89'
  };

  // A. Umbilical IR — Kofinas AD, et al. Am J Perinatol. 1992 (Semanas 16 a 19)
  const TABELA_IR_UMBILICAL = {
    16: '0,71 a 0,89',
    17: '0,70 a 0,88',
    18: '0,69 a 0,87',
    19: '0,68 a 0,86'
  };

  // A. Umbilical IP — Ciobanu A, et al. Ultrasound Obstet Gynecol. 2019 (Semanas 20 a 41)
  const TABELA_IP_UMBILICAL = {
    20: '0,96 a 1,55', 21: '0,94 a 1,53', 22: '0,92 a 1,50', 23: '0,91 a 1,47',
    24: '0,89 a 1,45', 25: '0,87 a 1,42', 26: '0,85 a 1,40', 27: '0,84 a 1,37',
    28: '0,82 a 1,35', 29: '0,80 a 1,32', 30: '0,78 a 1,30', 31: '0,76 a 1,28',
    32: '0,74 a 1,25', 33: '0,73 a 1,23', 34: '0,71 a 1,21', 35: '0,69 a 1,18',
    36: '0,67 a 1,16', 37: '0,65 a 1,14', 38: '0,63 a 1,12', 39: '0,61 a 1,10',
    40: '0,59 a 1,08', 41: '0,57 a 1,05'
  };

  // A. Cerebral Média IP — Ciobanu A, et al. Ultrasound Obstet Gynecol. 2019 (Semanas 20 a 41)
  const TABELA_IP_ACM = {
    20: '1,16 a 1,90', 21: '1,21 a 1,96', 22: '1,26 a 2,02', 23: '1,31 a 2,08',
    24: '1,36 a 2,14', 25: '1,41 a 2,20', 26: '1,45 a 2,26', 27: '1,48 a 2,31',
    28: '1,50 a 2,36', 29: '1,52 a 2,40', 30: '1,53 a 2,42', 31: '1,52 a 2,44',
    32: '1,50 a 2,44', 33: '1,47 a 2,43', 34: '1,43 a 2,39', 35: '1,37 a 2,34',
    36: '1,30 a 2,27', 37: '1,22 a 2,18', 38: '1,13 a 2,08', 39: '1,03 a 1,96',
    40: '0,93 a 1,82', 41: '0,83 a 1,67'
  };

  // Relação Cerebroplacentária (RCP) — Limite inferior de normalidade (> valor)
  // Ciobanu A, et al. Ultrasound Obstet Gynecol. 2019 (Semanas 20 a 41)
  const TABELA_RCP = {
    20: '0,87', 21: '0,93', 22: '1,00', 23: '1,06', 24: '1,12',
    25: '1,18', 26: '1,24', 27: '1,29', 28: '1,34', 29: '1,38',
    30: '1,41', 31: '1,43', 32: '1,44', 33: '1,43', 34: '1,42',
    35: '1,39', 36: '1,35', 37: '1,30', 38: '1,24', 39: '1,17',
    40: '1,09', 41: '1,00'
  };

  // =========================================================================
  // 2. ESTADO CENTRALIZADO DO MÓDULO OBSTÉTRICO COM DOPPLER
  // =========================================================================
  const state = {
    semanaAtiva: null, // Semana ativa de 16 a 41 identificada pela datação
    semanaInvalidaInfo: null, // Guarda info se semana informada for fora da faixa (ex: <16 ou >41)
    currentRenderedWeek: null, // Última semana renderizada no laudo
    isManualEdit: false,
    manualEditBlocks: new Set(),
    deletedBlocks: new Set(),
    lastGeneratedBlocks: {},
    userEditedSlots: {},      // { blockId: Set<slotKey> }
    lastGeneratedSlots: {},   // { blockId: { slotKey: html } }

    cronologia: {
      dumStatus: 'sim',
      dum: '',
      dumCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      dumPadrao: true,
      metodoAlternativo: 'primeira_usg',
      primeiraUsgData: '',
      primeiraUsgSem: '',
      primeiraUsgDias: '',
      primeiraUsgCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      igReferidaSem: '',
      igReferidaDias: '',
      igAtiva: { valid: false, semanas: null, dias: null, metodo: null, origemTexto: '', dpp: '' }
    },

    estatica: {
      situacao: 'longitudinal',
      apresentacao: 'cefalica',
      dorso: 'direita',
      movimentacao: 'ativa_normal'
    },

    bcf: '',

    placenta: {
      insercao: 'corporal anterior',
      grau: 'I',
      espessura: '',
      cordao: 'tres_vasos'
    },

    liquido: {
      ila: '',
      maiorBolsao: '',
      classificacao: 'normal',
      statusRef: 'aguardando'
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

    doppler: {
      uterinaIrD: '',
      uterinaIpD: '',
      uterinaIrE: '',
      uterinaIpE: '',
      ipMedioUterinas: null, // (uterinaIpD + uterinaIpE) / 2
      incisura: 'ausente',   // 'ausente' | 'presente_d' | 'presente_e' | 'bilateral'
      umbilicalIr: '',       // 16 a 19
      umbilicalIp: '',       // 20 a 41
      acmIp: '',             // 20 a 41
      rcp: null              // acmIp / umbilicalIp
    },

    conclusao: {
      crescimento: 'adequado', // 'adequado' | 'restricao' | 'macrossomia' | 'pigm' | 'gigm'
      vitalidade: 'adequada',
      hemoMaterno: 'normal', // 'normal' | 'alterado'
      hemoFetal: 'normal',   // 'normal' | 'alterado'
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

    // Tela de erro / navegação
    dom.errorScreen = document.getElementById('errorScreen');
    dom.errorScreenMsg = document.getElementById('errorScreenMsg');
    dom.mainWrapper = document.getElementById('mainWrapper');
    dom.badgeSemanaDoppler = document.getElementById('badgeSemanaDoppler');
    dom.displaySemanaDoppler = document.getElementById('displaySemanaDoppler');

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
    dom.badgeIgDestaque = document.getElementById('badgeIgDestaque');

    // Estática
    dom.selSituacao = document.getElementById('selSituacao');
    dom.selApresentacao = document.getElementById('selApresentacao');
    dom.selDorso = document.getElementById('selDorso');
    dom.selMovimentacao = document.getElementById('selMovimentacao');

    // BCF
    dom.inputFcf = document.getElementById('inputFcf');

    // Placenta
    dom.selPlacentaInsercao = document.getElementById('selPlacentaInsercao');
    dom.selPlacentaGrau = document.getElementById('selPlacentaGrau');
    dom.inputPlacentaEspessura = document.getElementById('inputPlacentaEspessura');
    dom.selCordao = document.getElementById('selCordao');

    // Líquido
    dom.containerIla = document.getElementById('containerIla');
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
    dom.displayCcCaVal = document.getElementById('displayCcCaVal');
    dom.displayDbfDof = document.getElementById('displayDbfDof');
    dom.displayDbfDofVal = document.getElementById('displayDbfDofVal');
    dom.displayPesoFetal = document.getElementById('displayPesoFetal');
    dom.displayPesoFetalVal = document.getElementById('displayPesoFetalVal');
    dom.displayPercentilPeso = document.getElementById('displayPercentilPeso');
    dom.displayPercentilPesoVal = document.getElementById('displayPercentilPesoVal');
    dom.displayIgBiometria = document.getElementById('displayIgBiometria');
    dom.displayIgBiometriaVal = document.getElementById('displayIgBiometriaVal');

    // Doppler
    dom.cardDoppler = document.getElementById('cardDoppler');
    dom.inputUterinaIrD = document.getElementById('inputUterinaIrD');
    dom.inputUterinaIpD = document.getElementById('inputUterinaIpD');
    dom.inputUterinaIrE = document.getElementById('inputUterinaIrE');
    dom.inputUterinaIpE = document.getElementById('inputUterinaIpE');
    dom.displayIpMedioUterinas = document.getElementById('displayIpMedioUterinas');
    dom.displayIpMedioUterinasVal = document.getElementById('displayIpMedioUterinasVal');
    dom.badgeIpMedioRef = document.getElementById('badgeIpMedioRef');
    dom.badgeIpMedioRefTexto = document.getElementById('badgeIpMedioRefTexto');
    dom.selIncisura = document.getElementById('selIncisura');

    dom.containerUmbilicalIr = document.getElementById('containerUmbilicalIr');
    dom.inputUmbilicalIr = document.getElementById('inputUmbilicalIr');
    dom.badgeUmbilicalIrRef = document.getElementById('badgeUmbilicalIrRef');
    dom.badgeUmbilicalIrRefTexto = document.getElementById('badgeUmbilicalIrRefTexto');

    dom.containerUmbilicalIp = document.getElementById('containerUmbilicalIp');
    dom.inputUmbilicalIp = document.getElementById('inputUmbilicalIp');
    dom.badgeUmbilicalIpRef = document.getElementById('badgeUmbilicalIpRef');
    dom.badgeUmbilicalIpRefTexto = document.getElementById('badgeUmbilicalIpRefTexto');

    dom.containerAcm = document.getElementById('containerAcm');
    dom.inputAcmIp = document.getElementById('inputAcmIp');
    dom.badgeAcmRef = document.getElementById('badgeAcmRef');
    dom.badgeAcmRefTexto = document.getElementById('badgeAcmRefTexto');

    dom.displayRcp = document.getElementById('displayRcp');
    dom.displayRcpVal = document.getElementById('displayRcpVal');
    dom.badgeRcpRef = document.getElementById('badgeRcpRef');
    dom.badgeRcpRefTexto = document.getElementById('badgeRcpRefTexto');

    // Conclusão
    dom.containerCrescimento = document.getElementById('containerCrescimento');
    dom.selConclusaoCrescimento = document.getElementById('selConclusaoCrescimento');
    dom.containerVitalidade = document.getElementById('containerVitalidade');
    dom.selConclusaoVitalidade = document.getElementById('selConclusaoVitalidade');
    dom.selHemoMaterno = document.getElementById('selHemoMaterno');
    dom.selHemoFetal = document.getElementById('selHemoFetal');
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
  // 4. BLOQUEIO EXPLÍCITO E VALIDAÇÃO DE REFERÊNCIAS (SEM VALORES SILENCIOSOS)
  // =========================================================================

  function blockWithReferenceError(week, refName) {
    state.semanaAtiva = null;
    const msg = `Erro clínico: Referência obrigatória de ${refName} não encontrada para a semana ${week}. A geração do laudo foi bloqueada para evitar exibição de valores incorretos.`;
    if (dom.errorScreen) {
      dom.errorScreen.style.display = 'flex';
      if (dom.errorScreenMsg) dom.errorScreenMsg.textContent = msg;
    }
    if (dom.mainWrapper) dom.mainWrapper.style.display = 'none';
    if (dom.reportPaper) dom.reportPaper.innerHTML = '';
  }

  function parseAndValidateWeek(rawVal) {
    if (rawVal === null || rawVal === undefined) return null;
    const str = String(rawVal).trim();
    // Validação estrita: aceita exclusivamente número inteiro de 16 a 41
    if (!/^(1[6-9]|[2-3][0-9]|4[0-1])$/.test(str)) {
      return null;
    }
    const num = Number(str);
    if (!Number.isInteger(num) || num < 16 || num > 41) {
      return null;
    }
    return num;
  }

  function validateWeekAndReferences(week) {
    if (!week) {
      return {
        valid: false,
        error: 'Semana gestacional não identificada ou inválida. Por favor, selecione uma semana inteira entre 16 e 41 na tela inicial.'
      };
    }

    // 1. IP médio das artérias uterinas (Gómez 2008)
    const refIpUt = TABELA_IP_UTERINAS[week];
    if (!refIpUt || typeof refIpUt !== 'string' || refIpUt.trim() === '') {
      return {
        valid: false,
        error: `Erro clínico: Referência de IP médio das artérias uterinas ausente para a semana ${week}. O laudo não pode ser gerado sem referências oficiais completas.`
      };
    }

    // 2. Líquido amniótico
    const refIla = TABELA_ILA_REFERENCIA[week];
    if (!refIla) {
      return {
        valid: false,
        error: `Erro clínico: Referência de líquido amniótico ausente para a semana ${week}. O laudo não pode ser gerado.`
      };
    }

    if (week < 20) {
      // Semanas 16 a 19: A. Umbilical IR (Kofinas 1992)
      const refUmbIr = TABELA_IR_UMBILICAL[week];
      if (!refUmbIr || typeof refUmbIr !== 'string' || refUmbIr.trim() === '') {
        return {
          valid: false,
          error: `Erro clínico: Referência de IR da artéria umbilical ausente para a semana ${week}. O laudo não pode ser gerado.`
        };
      }
    } else {
      // Semanas 20 a 41: ILA numérico (Moore 1990), A. Umbilical IP, ACM IP e RCP (Ciobanu 2019)
      if (typeof refIla.min !== 'number' || typeof refIla.max !== 'number') {
        return {
          valid: false,
          error: `Erro clínico: Limites numéricos de ILA ausentes para a semana ${week}. O laudo não pode ser gerado.`
        };
      }

      const refUmbIp = TABELA_IP_UMBILICAL[week];
      if (!refUmbIp || typeof refUmbIp !== 'string' || refUmbIp.trim() === '') {
        return {
          valid: false,
          error: `Erro clínico: Referência de IP da artéria umbilical ausente para a semana ${week}. O laudo não pode ser gerado.`
        };
      }

      const refAcm = TABELA_IP_ACM[week];
      if (!refAcm || typeof refAcm !== 'string' || refAcm.trim() === '') {
        return {
          valid: false,
          error: `Erro clínico: Referência de IP da artéria cerebral média ausente para a semana ${week}. O laudo não pode ser gerado.`
        };
      }

      const refRcp = TABELA_RCP[week];
      if (!refRcp || typeof refRcp !== 'string' || refRcp.trim() === '') {
        return {
          valid: false,
          error: `Erro clínico: Referência da relação cerebroplacentária (RCP) ausente para a semana ${week}. O laudo não pode ser gerado.`
        };
      }
    }

    return { valid: true };
  }

  function getActiveWeekForReference() {
    // SEM semana padrão como 28: retorna estritamente a semana ativa ou null
    if (!state.semanaAtiva) return null;
    return state.semanaAtiva;
  }

  // =========================================================================
  // 5. FUNÇÕES UTILITÁRIAS E MATEMÁTICAS
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
  // 6. DATAÇÃO E IDADE GESTACIONAL DE REFERÊNCIA
  // =========================================================================

  function updateActiveGestationalAge() {
    const cron = state.cronologia;

    cron.igAtiva = {
      valid: false,
      semanas: null,
      dias: null,
      metodo: null,
      origemTexto: '',
      dpp: ''
    };

    if (cron.dumStatus === 'sim' && cron.dumPadrao) {
      if (cron.dumCalculada && cron.dumCalculada.valid) {
        cron.igAtiva = {
          valid: true,
          semanas: cron.dumCalculada.semanas,
          dias: cron.dumCalculada.dias,
          metodo: 'dum',
          origemTexto: 'pela DUM',
          dpp: cron.dumCalculada.dpp
        };
      }
    } else {
      if (cron.metodoAlternativo === 'primeira_usg') {
        if (cron.primeiraUsgCalculada && cron.primeiraUsgCalculada.valid) {
          cron.igAtiva = {
            valid: true,
            semanas: cron.primeiraUsgCalculada.semanas,
            dias: cron.primeiraUsgCalculada.dias,
            metodo: 'primeira_usg',
            origemTexto: 'segundo exame ultrassonográfico inicial',
            dpp: cron.primeiraUsgCalculada.dpp
          };
        }
      } else if (cron.metodoAlternativo === 'referida') {
        const rawSem = cron.igReferidaSem;
        if (rawSem !== '' && rawSem !== null && rawSem !== undefined) {
          const sem = parseInt(rawSem, 10);
          if (!isNaN(sem)) {
            const rawDias = cron.igReferidaDias;
            const d = (rawDias !== '' && rawDias !== null && rawDias !== undefined) ? parseInt(rawDias, 10) : 0;
            const diasVal = (!isNaN(d) && d >= 0 && d <= 6) ? d : 0;
            cron.igAtiva = {
              valid: true,
              semanas: sem,
              dias: diasVal,
              metodo: 'referida',
              origemTexto: 'pela idade gestacional referida',
              dpp: ''
            };
          }
        }
      }
    }

    // Avaliação e identificação automática da semana gestacional ativa (16 a 41 semanas)
    if (cron.igAtiva.valid) {
      const rawSem = cron.igAtiva.semanas;
      const weekCandidate = parseAndValidateWeek(rawSem);

      if (weekCandidate) {
        // Semana inteira válida de 16 a 41 semanas
        state.semanaAtiva = weekCandidate;
        state.semanaInvalidaInfo = null;

        if (dom.displaySemanaDoppler) {
          dom.displaySemanaDoppler.textContent = `${weekCandidate} semanas (${cron.igAtiva.origemTexto})`;
        }
        if (dom.displayIgVigente && dom.badgeIgDestaque) {
          const dppTxt = cron.igAtiva.dpp ? ` | DPP: ${cron.igAtiva.dpp}` : '';
          dom.badgeIgDestaque.textContent = `${cron.igAtiva.semanas} semanas e ${cron.igAtiva.dias} dias (${cron.igAtiva.origemTexto}${dppTxt})`;
          dom.displayIgVigente.style.display = 'flex';
        }

        // Validação centralizada e rigorosa das referências oficiais da semana
        const validation = validateWeekAndReferences(weekCandidate);
        if (!validation.valid) {
          blockWithReferenceError(weekCandidate, validation.error);
          return;
        }

        configureWeekVisibility(weekCandidate);
        updateDopplerReferences(weekCandidate);
        if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';
      } else {
        // Idade informada é inválida ou fora do intervalo de 16 a 41 semanas
        state.semanaAtiva = null;
        state.semanaInvalidaInfo = {
          semanas: rawSem,
          dias: cron.igAtiva.dias
        };

        if (dom.displaySemanaDoppler) {
          dom.displaySemanaDoppler.innerHTML = `<span style="color:#dc2626; font-weight:700;">${rawSem} semanas (fora da faixa de 16 a 41 semanas)</span>`;
        }
        if (dom.displayIgVigente) dom.displayIgVigente.style.display = 'none';
        if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Aguardando Idade Gestacional Válida';
      }
    } else {
      // Idade gestacional ausente / ainda não preenchida
      state.semanaAtiva = null;
      state.semanaInvalidaInfo = null;

      if (dom.displaySemanaDoppler) {
        dom.displaySemanaDoppler.textContent = 'Aguardando datação';
      }
      if (dom.displayIgVigente) dom.displayIgVigente.style.display = 'none';
      if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Aguardando Idade Gestacional';
    }

    updateIlaReference();
    calculateBiometry();
    renderReportText();
  }

  function updateIlaReference() {
    const sem = getActiveWeekForReference();
    if (!sem) {
      state.liquido.statusRef = 'aguardando';
      return;
    }

    const ref = TABELA_ILA_REFERENCIA[sem];
    if (!ref) {
      blockWithReferenceError(sem, 'limites de referência de líquido amniótico');
      return;
    }

    if (sem < 20) {
      if (dom.ilaRefDisplay) dom.ilaRefDisplay.style.display = 'none';
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
      if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      state.liquido.statusRef = 'aguardando';
      return;
    }

    if (typeof ref.min !== 'number' || typeof ref.max !== 'number') {
      blockWithReferenceError(sem, 'limites numéricos de ILA');
      return;
    }

    if (dom.ilaRefDisplay && dom.ilaRefTexto) {
      dom.ilaRefTexto.innerHTML = `Referência oficial de ILA para <strong>${sem} semanas</strong>: <strong>${ref.min} a ${ref.max} mm</strong> (Moore et al., 1990)`;
      dom.ilaRefDisplay.style.display = 'block';
    }

    const valStr = state.liquido.ila;
    if (valStr === '' || valStr === null || isNaN(valStr)) {
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
      if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      state.liquido.statusRef = 'aguardando';
      return;
    }

    const val = Number(valStr);
    if (val >= ref.min && val <= ref.max) {
      state.liquido.statusRef = 'normal';
      state.liquido.classificacao = 'normal';
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'flex';
      if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
    } else if (val < ref.min) {
      state.liquido.statusRef = 'abaixo';
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
      if (dom.ilaFeedbackAlerta && dom.ilaAlertaTexto) {
        dom.ilaAlertaTexto.textContent = `Atenção: O ILA informado (${val} mm) está ABAIXO do limite de referência (${ref.min} mm) para ${sem} semanas.`;
        dom.ilaFeedbackAlerta.style.display = 'flex';
      }
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';
      if (dom.selIlaClassificacao && (dom.selIlaClassificacao.value !== 'diminuido' && dom.selIlaClassificacao.value !== 'oligoidramnio')) {
        dom.selIlaClassificacao.value = 'diminuido';
        state.liquido.classificacao = 'diminuido';
      }
    } else {
      state.liquido.statusRef = 'acima';
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
      if (dom.ilaFeedbackAlerta && dom.ilaAlertaTexto) {
        dom.ilaAlertaTexto.textContent = `Atenção: O ILA informado (${val} mm) está ACIMA do limite de referência (${ref.max} mm) para ${sem} semanas.`;
        dom.ilaFeedbackAlerta.style.display = 'flex';
      }
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';
      if (dom.selIlaClassificacao && (dom.selIlaClassificacao.value !== 'aumentado' && dom.selIlaClassificacao.value !== 'polidramnio')) {
        dom.selIlaClassificacao.value = 'aumentado';
        state.liquido.classificacao = 'aumentado';
      }
    }
  }

  // =========================================================================
  // 8. BIOMETRIA FETAL E HADLOCK
  // =========================================================================

  function calculateBiometry() {
    const bio = state.biometria;
    const dbp = bio.dbp !== '' ? parseFloat(bio.dbp) : NaN;
    const dof = bio.dof !== '' ? parseFloat(bio.dof) : NaN;
    const cc  = bio.cc  !== '' ? parseFloat(bio.cc)  : NaN;
    const ca  = bio.ca  !== '' ? parseFloat(bio.ca)  : NaN;
    const cf  = bio.cf  !== '' ? parseFloat(bio.cf)  : NaN;

    // Relação CC/CA
    if (!isNaN(cc) && !isNaN(ca) && ca > 0) {
      bio.ccCa = cc / ca;
      if (dom.displayCcCa && dom.displayCcCaVal) {
        dom.displayCcCaVal.textContent = formatNumBR(bio.ccCa, 2);
        dom.displayCcCa.style.display = 'flex';
      }
    } else {
      bio.ccCa = null;
      if (dom.displayCcCa) dom.displayCcCa.style.display = 'none';
    }

    // Índice Cefálico DBP/DOF
    if (!isNaN(dbp) && !isNaN(dof) && dof > 0) {
      bio.indiceCefalico = (dbp / dof) * 100;
      if (dom.displayDbfDof && dom.displayDbfDofVal) {
        dom.displayDbfDofVal.textContent = formatNumBR(bio.indiceCefalico, 1);
        dom.displayDbfDof.style.display = 'flex';
      }
    } else {
      bio.indiceCefalico = null;
      if (dom.displayDbfDof) dom.displayDbfDof.style.display = 'none';
    }

    // Peso Fetal Estimado (Hadlock 4 parâmetros: DBP, CC, CA, CF em cm)
    if (!isNaN(dbp) && !isNaN(cc) && !isNaN(ca) && !isNaN(cf) && dbp > 0 && cc > 0 && ca > 0 && cf > 0) {
      const dbpCm = dbp / 10;
      const ccCm  = cc  / 10;
      const caCm  = ca  / 10;
      const cfCm  = cf  / 10;

      const log10Weight = 1.3596 + (0.0064 * ccCm) + (0.0424 * caCm) + (0.174 * cfCm) + (0.00061 * dbpCm * caCm) - (0.00386 * caCm * cfCm);
      bio.peso = Math.pow(10, log10Weight);

      if (dom.displayPesoFetal && dom.displayPesoFetalVal) {
        dom.displayPesoFetalVal.textContent = `${Math.round(bio.peso)} g (+/- 10%)`;
        dom.displayPesoFetal.style.display = 'flex';
      }

      // Percentil do Peso de Hadlock
      const semRef = (state.cronologia.igAtiva && state.cronologia.igAtiva.valid)
        ? (state.cronologia.igAtiva.semanas + state.cronologia.igAtiva.dias / 7)
        : (state.semanaAtiva || null);

      if (semRef && semRef >= 16 && semRef <= 42) {
        const ga = semRef;
        const meanLog10 = 0.578 + (0.332 * ga) - (0.00354 * ga * ga);
        const sdLog10 = 0.12;
        const zScore = (log10Weight - meanLog10) / sdLog10;
        bio.percentil = zToPercentile(zScore);

        if (dom.displayPercentilPeso && dom.displayPercentilPesoVal) {
          dom.displayPercentilPesoVal.textContent = `p${bio.percentil}`;
          dom.displayPercentilPeso.style.display = 'flex';
        }
      } else {
        bio.percentil = null;
        if (dom.displayPercentilPeso) dom.displayPercentilPeso.style.display = 'none';
      }
    } else {
      bio.peso = null;
      bio.percentil = null;
      if (dom.displayPesoFetal) dom.displayPesoFetal.style.display = 'none';
      if (dom.displayPercentilPeso) dom.displayPercentilPeso.style.display = 'none';
    }

    // IG Biométrica Estimada — AUA (Average Ultrasound Age, metodologia GE Voluson S6)
    // Média aritmética das estimativas individuais válidas de Hadlock (convertidas em dias)
    const gasDias = [];
    if (!isNaN(dbp) && dbp > 0) {
      const dbpCm = dbp / 10;
      gasDias.push((9.54 + (1.482 * dbpCm) + (0.1676 * dbpCm * dbpCm)) * 7);
    }
    if (!isNaN(cc) && cc > 0) {
      const ccCm = cc / 10;
      gasDias.push((8.96 + (0.540 * ccCm) + (0.0003 * ccCm * ccCm * ccCm)) * 7);
    }
    if (!isNaN(ca) && ca > 0) {
      const caCm = ca / 10;
      gasDias.push((8.14 + (0.753 * caCm) + (0.0036 * caCm * caCm)) * 7);
    }
    if (!isNaN(cf) && cf > 0) {
      const cfCm = cf / 10;
      gasDias.push((10.35 + (2.460 * cfCm) + (0.170 * cfCm * cfCm)) * 7);
    }

    if (gasDias.length > 0) {
      const mediaDias = gasDias.reduce((a, b) => a + b, 0) / gasDias.length;
      const totalDias = Math.round(mediaDias);
      let semanas = Math.floor(totalDias / 7);
      let dias    = totalDias % 7;
      if (dias >= 7) {
        semanas += Math.floor(dias / 7);
        dias = dias % 7;
      }
      const margem = semanas >= 28 ? 21 : 14;

      bio.igBiometria = { valid: true, semanas, dias, margemDias: margem };

      if (dom.displayIgBiometria && dom.displayIgBiometriaVal) {
        dom.displayIgBiometriaVal.textContent = `${semanas} semanas e ${dias} dias (+/- ${margem} dias)`;
        dom.displayIgBiometria.style.display = 'flex';
      }
    } else {
      bio.igBiometria = { valid: false, semanas: 0, dias: 0, margemDias: 14 };
      if (dom.displayIgBiometria) dom.displayIgBiometria.style.display = 'none';
    }
  }

  // =========================================================================
  // 9. CÁLCULOS E REFERÊNCIAS DA DOPPLERFLUXOMETRIA
  // =========================================================================

  function calculateDoppler() {
    const dop = state.doppler;
    const week = state.semanaAtiva;

    // 1. IP Médio das Artérias Uterinas
    const ipD = dop.uterinaIpD !== '' ? parseFloat(dop.uterinaIpD) : NaN;
    const ipE = dop.uterinaIpE !== '' ? parseFloat(dop.uterinaIpE) : NaN;

    if (!isNaN(ipD) && !isNaN(ipE) && ipD > 0 && ipE > 0) {
      dop.ipMedioUterinas = (ipD + ipE) / 2;
      const formatted = formatNumBR(dop.ipMedioUterinas, 2);
      if (dom.displayIpMedioUterinas && dom.displayIpMedioUterinasVal) {
        dom.displayIpMedioUterinasVal.textContent = formatted;
        dom.displayIpMedioUterinas.style.display = 'flex';
      }
    } else {
      dop.ipMedioUterinas = null;
      if (dom.displayIpMedioUterinas) {
        dom.displayIpMedioUterinas.style.display = 'none';
      }
    }

    // 2. Relação Cerebroplacentária (RCP = IP ACM / IP Umbilical) — apenas semanas 20-41
    if (week && week >= 20) {
      const ipAcm = dop.acmIp !== '' ? parseFloat(dop.acmIp) : NaN;
      const ipUmb = dop.umbilicalIp !== '' ? parseFloat(dop.umbilicalIp) : NaN;

      if (!isNaN(ipAcm) && !isNaN(ipUmb) && ipAcm > 0 && ipUmb > 0) {
        dop.rcp = ipAcm / ipUmb;
        const formattedRcp = formatNumBR(dop.rcp, 2);
        if (dom.displayRcp && dom.displayRcpVal) {
          dom.displayRcpVal.textContent = formattedRcp;
          dom.displayRcp.style.display = 'flex';
        }
      } else {
        dop.rcp = null;
        if (dom.displayRcp) {
          dom.displayRcp.style.display = 'none';
        }
      }
    } else {
      dop.rcp = null;
      if (dom.displayRcp) dom.displayRcp.style.display = 'none';
    }
  }

  function updateDopplerReferences(week) {
    if (!week) return;

    // 1. IP Médio A. Uterinas (< limite) — SEM FALLBACK
    const refIpUt = TABELA_IP_UTERINAS[week];
    if (!refIpUt || typeof refIpUt !== 'string' || refIpUt.trim() === '') {
      blockWithReferenceError(week, 'IP médio das artérias uterinas');
      return;
    }
    if (dom.badgeIpMedioRef && dom.badgeIpMedioRefTexto) {
      dom.badgeIpMedioRefTexto.innerHTML = `Referência para ${week} semanas: <strong>IP médio &lt; ${refIpUt}</strong> (Gómez O, 2008)`;
      dom.badgeIpMedioRef.style.display = 'flex';
    }

    // 2. Fetal (IR para 16-19, IP + ACM + RCP para 20-41) — SEM FALLBACKS
    if (week < 20) {
      const refUmbIr = TABELA_IR_UMBILICAL[week];
      if (!refUmbIr || typeof refUmbIr !== 'string' || refUmbIr.trim() === '') {
        blockWithReferenceError(week, 'IR da artéria umbilical');
        return;
      }
      if (dom.badgeUmbilicalIrRef && dom.badgeUmbilicalIrRefTexto) {
        dom.badgeUmbilicalIrRefTexto.innerHTML = `Referência para ${week} semanas: <strong>IR = ${refUmbIr}</strong> (Kofinas AD, 1992)`;
        dom.badgeUmbilicalIrRef.style.display = 'flex';
      }
    } else {
      const refUmbIp = TABELA_IP_UMBILICAL[week];
      if (!refUmbIp || typeof refUmbIp !== 'string' || refUmbIp.trim() === '') {
        blockWithReferenceError(week, 'IP da artéria umbilical');
        return;
      }
      if (dom.badgeUmbilicalIpRef && dom.badgeUmbilicalIpRefTexto) {
        dom.badgeUmbilicalIpRefTexto.innerHTML = `Referência para ${week} semanas: <strong>IP = ${refUmbIp}</strong> (Ciobanu A, 2019)`;
        dom.badgeUmbilicalIpRef.style.display = 'flex';
      }

      const refAcm = TABELA_IP_ACM[week];
      if (!refAcm || typeof refAcm !== 'string' || refAcm.trim() === '') {
        blockWithReferenceError(week, 'IP da artéria cerebral média');
        return;
      }
      if (dom.badgeAcmRef && dom.badgeAcmRefTexto) {
        dom.badgeAcmRefTexto.innerHTML = `Referência para ${week} semanas: <strong>IP = ${refAcm}</strong> (Ciobanu A, 2019)`;
        dom.badgeAcmRef.style.display = 'flex';
      }

      const refRcp = TABELA_RCP[week];
      if (!refRcp || typeof refRcp !== 'string' || refRcp.trim() === '') {
        blockWithReferenceError(week, 'relação cerebroplacentária (RCP)');
        return;
      }
      if (dom.badgeRcpRef && dom.badgeRcpRefTexto) {
        dom.badgeRcpRefTexto.innerHTML = `Referência para ${week} semanas: <strong>RCP &gt; ${refRcp}</strong> (Ciobanu A, 2019)`;
        dom.badgeRcpRef.style.display = 'flex';
      }
    }
  }

  function configureWeekVisibility(week) {
    if (!week) return;

    // A. Líquido Amniótico: 16-19 apenas Maior Bolsão; 20-41 com ILA
    if (dom.containerIla) {
      dom.containerIla.style.display = (week >= 20) ? 'block' : 'none';
    }

    // B. Umbilical: 16-19 IR; 20-41 IP
    if (dom.containerUmbilicalIr) {
      dom.containerUmbilicalIr.style.display = (week < 20) ? 'block' : 'none';
    }
    if (dom.containerUmbilicalIp) {
      dom.containerUmbilicalIp.style.display = (week >= 20) ? 'block' : 'none';
    }

    // C. ACM e RCP: apenas 20-41
    if (dom.containerAcm) {
      dom.containerAcm.style.display = (week >= 20) ? 'block' : 'none';
    }

    // D. Conclusão - Crescimento Fetal: apenas 20-41 (Hadlock)
    if (dom.containerCrescimento) {
      dom.containerCrescimento.style.display = (week >= 20) ? 'block' : 'none';
    }

    // E. Conclusão - Vitalidade Fetal: semanas 16-40; oculto na semana 41
    if (dom.containerVitalidade) {
      dom.containerVitalidade.style.display = (week <= 40) ? 'block' : 'none';
    }

    updateDopplerReferences(week);
  }

  // =========================================================================
  // 10. SISTEMA DE SINCRONIZAÇÃO INTELIGENTE POR SLOTS E EDIÇÕES MANUAIS
  // =========================================================================

  function normalizeContent(html) {
    if (!html) return '';
    return html.replace(/\s+/g, ' ').trim();
  }

  function getSlotKeyFromElement(el) {
    if (!el) return null;
    const dynamicKey = el.getAttribute('data-slot');
    if (dynamicKey) return `dynamic:${dynamicKey}`;
    const staticKey = el.getAttribute('data-static-slot');
    if (staticKey) return `static:${staticKey}`;
    return null;
  }

  function findSlotElement(container, slotKey) {
    if (!container || !slotKey) return null;
    if (slotKey.startsWith('dynamic:')) {
      return container.querySelector(`[data-slot="${slotKey.slice(8)}"]`);
    }
    if (slotKey.startsWith('static:')) {
      return container.querySelector(`[data-static-slot="${slotKey.slice(7)}"]`);
    }
    return null;
  }

  function getDomSlotKeys(container) {
    if (!container) return new Set();
    const keys = new Set();
    container.querySelectorAll('[data-slot]').forEach(el => {
      keys.add(`dynamic:${el.getAttribute('data-slot')}`);
    });
    container.querySelectorAll('[data-static-slot]').forEach(el => {
      keys.add(`static:${el.getAttribute('data-static-slot')}`);
    });
    return keys;
  }

  /**
   * Cria um contêiner adequado para parsear HTML de tabela ou de parágrafo.
   * Fragmentos de tabela (<thead>, <tbody>, <tr>, <td>, <th>) devem ser parseados
   * dentro de um elemento <table>. Atribuir esses fragmentos a um <div> causa
   * foster-parenting pelo parser HTML5, descartando as tags de tabela.
   */
  function createContainerForHtml(html, tag) {
    if (!html) return document.createElement('div');
    const isTableTag = tag && tag.toLowerCase() === 'table';
    const hasTableFragment = /^\s*<(thead|tbody|tfoot|tr|th|td)\b/i.test(html.trim());
    if (isTableTag || hasTableFragment) {
      const tbl = document.createElement('table');
      tbl.innerHTML = html;
      return tbl;
    }
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  }

  function extractSlots(html, tag) {
    if (!html) return {};
    const temp = createContainerForHtml(html, tag || 'p');
    const slots = {};
    temp.querySelectorAll('[data-slot]').forEach(el => {
      slots[`dynamic:${el.getAttribute('data-slot')}`] = el.innerHTML;
    });
    temp.querySelectorAll('[data-static-slot]').forEach(el => {
      slots[`static:${el.getAttribute('data-static-slot')}`] = el.innerHTML;
    });
    return slots;
  }

  function getActiveCaretElement(container) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    let node = range.startContainer || sel.anchorNode;
    if (!node) return null;

    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length > 0) {
      const offset = Math.min(range.startOffset, node.childNodes.length - 1);
      const child = node.childNodes[offset];
      if (child) {
        el = child.nodeType === Node.TEXT_NODE ? child.parentElement : child;
      }
    }

    if (el && container && container.contains(el)) {
      return el;
    }
    return null;
  }

  function updateManualEditStatus() {
    if (!dom.reportPaper) return;

    let hasEdits = false;
    if (state.manualEditBlocks.size > 0) hasEdits = true;
    if (!hasEdits && Object.values(state.userEditedSlots).some(s => s && s.size > 0)) hasEdits = true;
    if (!hasEdits && state.deletedBlocks && state.deletedBlocks.size > 0) hasEdits = true;
    if (!hasEdits && dom.reportPaper.querySelectorAll('[data-custom="true"]').length > 0) hasEdits = true;

    if (!hasEdits) {
      const domBlocks = dom.reportPaper.querySelectorAll(':scope > [data-block]');
      for (let i = 0; i < domBlocks.length; i++) {
        const el = domBlocks[i];
        const id = el.getAttribute('data-block');
        if (el.getAttribute('data-manual-edit') === 'true') {
          hasEdits = true;
          break;
        }
        if (state.lastGeneratedBlocks[id] !== undefined) {
          if (normalizeContent(el.innerHTML) !== normalizeContent(state.lastGeneratedBlocks[id])) {
            hasEdits = true;
            break;
          }
        }
      }
    }

    state.isManualEdit = hasEdits;

    if (dom.manualEditBadge) {
      dom.manualEditBadge.classList.toggle('active', hasEdits);
      dom.manualEditBadge.style.display = hasEdits ? 'inline-block' : 'none';
    }
    if (dom.btnRestaurarLaudo) {
      dom.btnRestaurarLaudo.style.display = hasEdits ? 'inline-flex' : 'none';
    }
    if (dom.laudoStatusText) {
      dom.laudoStatusText.textContent = hasEdits ? 'Laudo com Edições Manuais' : 'Laudo Dinâmico Sincronizado';
    }
  }

  function syncReportBlocks(blocks) {
    if (!dom.reportPaper) return;

    // Se a folha estiver com o aviso de aguardando datação, limpa para montagem dos blocos
    if (dom.reportPaper.querySelector('.report-empty-notice')) {
      dom.reportPaper.innerHTML = '';
    }

    if (!dom.reportPaper.children.length) {
      dom.reportPaper.innerHTML = blocks.map(b => {
        const clsAttr = b.className ? ` class="${b.className}"` : '';
        const tag = b.tag || 'p';
        return `<${tag}${clsAttr} data-block="${b.id}">${b.html}</${tag}>`;
      }).join('\n');

      state.lastGeneratedBlocks = {};
      state.lastGeneratedSlots  = {};
      state.userEditedSlots     = {};
      blocks.forEach(b => {
        state.lastGeneratedBlocks[b.id] = b.html;
        const slots = extractSlots(b.html, b.tag);
        if (Object.keys(slots).length) state.lastGeneratedSlots[b.id] = slots;
      });
      state.manualEditBlocks.clear();
      if (state.deletedBlocks) state.deletedBlocks.clear();
      state.isManualEdit = false;
      if (dom.manualEditBadge)   dom.manualEditBadge.style.display = 'none';
      if (dom.laudoStatusText)   dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';
      if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
      return;
    }

    // Sincronização incremental bloco a bloco
    const currentBlockIds = new Set(blocks.map(b => b.id));
    let lastDomEl = null;

    blocks.forEach(b => {
      const existingEl = dom.reportPaper.querySelector(`:scope > [data-block="${b.id}"]`);

      if (existingEl) {
        const newSlots  = extractSlots(b.html, b.tag);
        const hasSlots  = Object.keys(newSlots).length > 0;
        const userSlots = state.userEditedSlots[b.id] || new Set();
        let customAnchor = existingEl;

        if (hasSlots) {
          const newSlotKeys = new Set(Object.keys(newSlots));
          const domSlotKeys = getDomSlotKeys(existingEl);

          // ── Verificar se todos os slots novos já existem no DOM do bloco ──
          // Para blocos de tabela, sempre que a estrutura DOM da tabela estiver
          // intacta (todos os data-slot presentes), atualizar os slots diretamente
          // no DOM vivo em vez de substituir existingEl.innerHTML — isso evita
          // que o parser HTML5 destrua thead/tbody/tr/td ao reatribuir innerHTML
          // de um elemento <table> com fragmentos parseados via <div>.
          const allSlotsInDom = newSlotKeys.size > 0 && [...newSlotKeys].every(k => !!findSlotElement(existingEl, k));

          if (allSlotsInDom) {
            // ── Caminho rápido: atualizar somente os slots modificados no DOM vivo ──
            newSlotKeys.forEach(slotKey => {
              const domSlotEl = findSlotElement(existingEl, slotKey);
              if (!domSlotEl) return;

              if (userSlots.has(slotKey)) {
                // Slot editado pelo usuário: mantém conteúdo atual
                return;
              }

              // Verificar custom-origin pendente
              const customOriginEl = dom.reportPaper.querySelector(`[data-custom-origin="${b.id}_${slotKey}"]`);
              if (customOriginEl) {
                domSlotEl.innerHTML = customOriginEl.innerHTML;
                customOriginEl.remove();
                if (!state.userEditedSlots[b.id]) state.userEditedSlots[b.id] = new Set();
                state.userEditedSlots[b.id].add(slotKey);
                return;
              }

              // Atualizar somente se o valor mudou
              if (domSlotEl.innerHTML !== newSlots[slotKey]) {
                domSlotEl.innerHTML = newSlots[slotKey];
              }
            });

            // Tratar slots removidos (ainda presentes no DOM mas ausentes nos novos slots)
            domSlotKeys.forEach(oldSlotKey => {
              if (!newSlotKeys.has(oldSlotKey)) {
                if (userSlots.has(oldSlotKey)) {
                  const oldEl = findSlotElement(existingEl, oldSlotKey);
                  const editedContent = oldEl ? oldEl.innerHTML.trim() : '';
                  const lastGen = (state.lastGeneratedSlots[b.id] && state.lastGeneratedSlots[b.id][oldSlotKey])
                    ? state.lastGeneratedSlots[b.id][oldSlotKey].trim()
                    : '';

                  if (editedContent && normalizeContent(editedContent) !== normalizeContent(lastGen)) {
                    const originKey = `${b.id}_${oldSlotKey}`;
                    let existingCustom = dom.reportPaper.querySelector(`[data-custom-origin="${originKey}"]`);
                    if (!existingCustom) {
                      existingCustom = document.createElement('p');
                      existingCustom.setAttribute('data-custom', 'true');
                      existingCustom.setAttribute('data-custom-origin', originKey);
                    }
                    existingCustom.innerHTML = editedContent;

                    if (customAnchor.nextSibling !== existingCustom) {
                      if (customAnchor.nextSibling) {
                        dom.reportPaper.insertBefore(existingCustom, customAnchor.nextSibling);
                      } else {
                        dom.reportPaper.appendChild(existingCustom);
                      }
                    }
                    customAnchor = existingCustom;
                  }
                }
              }
            });

            if (existingEl.className !== b.className) existingEl.className = b.className;

          } else {
            // ── Reconstrução necessária: algum slot está ausente do DOM ──
            // Usar createContainerForHtml para garantir que fragmentos de tabela
            // sejam parseados corretamente.
            const temp = createContainerForHtml(b.html, b.tag);

            newSlotKeys.forEach(slotKey => {
              const targetEl = findSlotElement(temp, slotKey);
              if (!targetEl) return;

              if (userSlots.has(slotKey)) {
                const currentEl = findSlotElement(existingEl, slotKey);
                if (currentEl) {
                  targetEl.innerHTML = currentEl.innerHTML;
                }
              } else {
                const customOriginEl = dom.reportPaper.querySelector(`[data-custom-origin="${b.id}_${slotKey}"]`);
                if (customOriginEl) {
                  targetEl.innerHTML = customOriginEl.innerHTML;
                  customOriginEl.remove();
                  if (!state.userEditedSlots[b.id]) state.userEditedSlots[b.id] = new Set();
                  state.userEditedSlots[b.id].add(slotKey);
                }
              }
            });

            domSlotKeys.forEach(oldSlotKey => {
              if (!newSlotKeys.has(oldSlotKey)) {
                if (userSlots.has(oldSlotKey)) {
                  const oldEl = findSlotElement(existingEl, oldSlotKey);
                  const editedContent = oldEl ? oldEl.innerHTML.trim() : '';
                  const lastGen = (state.lastGeneratedSlots[b.id] && state.lastGeneratedSlots[b.id][oldSlotKey])
                    ? state.lastGeneratedSlots[b.id][oldSlotKey].trim()
                    : '';

                  if (editedContent && normalizeContent(editedContent) !== normalizeContent(lastGen)) {
                    const originKey = `${b.id}_${oldSlotKey}`;
                    let existingCustom = dom.reportPaper.querySelector(`[data-custom-origin="${originKey}"]`);
                    if (!existingCustom) {
                      existingCustom = document.createElement('p');
                      existingCustom.setAttribute('data-custom', 'true');
                      existingCustom.setAttribute('data-custom-origin', originKey);
                    }
                    existingCustom.innerHTML = editedContent;

                    if (customAnchor.nextSibling !== existingCustom) {
                      if (customAnchor.nextSibling) {
                        dom.reportPaper.insertBefore(existingCustom, customAnchor.nextSibling);
                      } else {
                        dom.reportPaper.appendChild(existingCustom);
                      }
                    }
                    customAnchor = existingCustom;
                  }
                }
              }
            });

            existingEl.innerHTML = temp.innerHTML;
            if (existingEl.className !== b.className) existingEl.className = b.className;
          }

          state.lastGeneratedSlots[b.id] = { ...newSlots };

          if (state.userEditedSlots[b.id]) {
            const currentDomKeys = getDomSlotKeys(existingEl);
            for (const editedKey of state.userEditedSlots[b.id]) {
              if (!currentDomKeys.has(editedKey)) {
                state.userEditedSlots[b.id].delete(editedKey);
              }
            }
            if (state.userEditedSlots[b.id].size === 0) {
              delete state.userEditedSlots[b.id];
            }
          }

        } else {
          const isEdited = state.manualEditBlocks.has(b.id) ||
                           existingEl.getAttribute('data-manual-edit') === 'true' ||
                           (state.lastGeneratedBlocks[b.id] !== undefined &&
                            normalizeContent(existingEl.innerHTML) !== normalizeContent(state.lastGeneratedBlocks[b.id]));

          if (isEdited) {
            state.manualEditBlocks.add(b.id);
            existingEl.setAttribute('data-manual-edit', 'true');
          } else {
            if (existingEl.innerHTML !== b.html) existingEl.innerHTML = b.html;
            if (existingEl.className !== b.className) existingEl.className = b.className;
          }
        }

        state.lastGeneratedBlocks[b.id] = b.html;

        let anchor = customAnchor;
        while (
          anchor.nextElementSibling &&
          (anchor.nextElementSibling.getAttribute('data-custom') === 'true' ||
           anchor.nextElementSibling.hasAttribute('data-custom-origin') ||
           !anchor.nextElementSibling.hasAttribute('data-block') ||
           !currentBlockIds.has(anchor.nextElementSibling.getAttribute('data-block')))
        ) {
          const nextOrigin = anchor.nextElementSibling.getAttribute('data-custom-origin');
          if (nextOrigin && !nextOrigin.startsWith(`${b.id}_`)) {
            const belongsToActiveBlock = Array.from(currentBlockIds).some(id => nextOrigin.startsWith(`${id}_`));
            if (belongsToActiveBlock) {
              break;
            }
          }
          anchor = anchor.nextElementSibling;
        }
        lastDomEl = anchor;

      } else {
        if (state.isManualEdit && state.deletedBlocks && state.deletedBlocks.has(b.id)) return;

        const tag = b.tag || 'p';
        const newEl = document.createElement(tag);
        if (b.className) newEl.className = b.className;
        newEl.setAttribute('data-block', b.id);
        newEl.innerHTML = b.html;

        if (lastDomEl && lastDomEl.nextSibling) {
          dom.reportPaper.insertBefore(newEl, lastDomEl.nextSibling);
        } else if (lastDomEl) {
          dom.reportPaper.appendChild(newEl);
        } else {
          dom.reportPaper.insertBefore(newEl, dom.reportPaper.firstChild);
        }

        state.lastGeneratedBlocks[b.id] = b.html;
        const slots = extractSlots(b.html, b.tag);
        if (Object.keys(slots).length) state.lastGeneratedSlots[b.id] = slots;
        lastDomEl = newEl;
      }
    });

    Array.from(dom.reportPaper.querySelectorAll(':scope > [data-block]')).forEach(el => {
      const blockId = el.getAttribute('data-block');
      if (!currentBlockIds.has(blockId)) {
        const hasUserSlots = state.userEditedSlots[blockId] && state.userEditedSlots[blockId].size > 0;
        const isUserBlock  = state.manualEditBlocks.has(blockId) ||
                             el.getAttribute('data-manual-edit') === 'true' ||
                             hasUserSlots;
        if (!isUserBlock) {
          el.remove();
          delete state.lastGeneratedBlocks[blockId];
          delete state.lastGeneratedSlots[blockId];
          delete state.userEditedSlots[blockId];
        }
      }
    });

    updateManualEditStatus();
  }

  // =========================================================================
  // 11. RENDERIZAÇÃO COMPLETA DO LAUDO (16 A 41 SEMANAS)
  // =========================================================================

  function renderReportText() {
    if (!dom.reportPaper) return;

    const week = state.semanaAtiva;

    // Se a idade gestacional estiver ausente ou inválida, impede a geração do laudo e exibe mensagem clara
    if (!week) {
      state.currentRenderedWeek = null;
      if (state.semanaInvalidaInfo) {
        const { semanas } = state.semanaInvalidaInfo;
        dom.reportPaper.innerHTML = `
          <div class="report-empty-notice error">
            <h3>Idade Gestacional Fora dos Limites do Exame (16 a 41 semanas)</h3>
            <p>A idade gestacional informada (<strong>${semanas} semanas</strong>) está fora dos limites de atendimento deste módulo.</p>
            <p>O exame <strong>Obstétrico com Doppler</strong> é realizado exclusivamente entre <strong>16 e 41 semanas</strong>, utilizando tabelas e valores de referência oficiais específicos para cada semana.</p>
            <p>Por favor, revise os dados informados na <strong>Seção 1 (Cronologia Gestacional e Datação)</strong> para carregar o laudo correspondente.</p>
          </div>
        `;
      } else {
        dom.reportPaper.innerHTML = `
          <div class="report-empty-notice">
            <h3>Aguardando Definição da Idade Gestacional</h3>
            <p>Para carregar a máscara e as referências oficiais de Doppler, informe a datação na <strong>Seção 1 (Cronologia Gestacional e Datação)</strong> ao lado:</p>
            <ul>
              <li><strong>Data da DUM</strong> (se conhecida); ou</li>
              <li><strong>1ª Ultrassonografia</strong> (data e idade gestacional); ou</li>
              <li><strong>Idade Gestacional Referida</strong> (entre 16 e 41 semanas).</li>
            </ul>
            <p>O laudo e os valores de normalidade (artérias uterinas, umbilical, cerebral média e relação cerebroplacentária) serão gerados automaticamente para a semana correspondente.</p>
          </div>
        `;
      }
      return;
    }

    // Se a semana mudou em relação à última renderização, reinicia o DOM da folha para aplicar a máscara correta
    if (state.currentRenderedWeek !== week) {
      state.currentRenderedWeek = week;
      dom.reportPaper.innerHTML = '';
    }

    const blocks = [];
    const add = (id, html, className = '', tag = 'p') => {
      blocks.push({ id, html, className, tag });
    };

    // 1. TÍTULO PRINCIPAL (OFICIAL COM DOPPLER COLORIDO)
    add('title', '<b>ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO</b>', 'report-title');
    add('sp_title', '&nbsp;', 'report-blank-line');

    // 2. CRONOLOGIA GESTACIONAL (DUM E DATAÇÃO)
    if (state.cronologia.dumStatus === 'sim') {
      if (state.cronologia.dum) {
        add('cron_dum', `<span data-static-slot="dum_lbl">Data da última menstruação: </span><span data-slot="dum_data">${state.cronologia.dum}</span><span data-static-slot="dum_pt">.</span>`);
      }
    } else if (state.cronologia.dumStatus === 'incerta') {
      add('cron_dum', '<span data-static-slot="dum_lbl">Data da última menstruação: </span><span data-static-slot="dum_val">incerta.</span>');
    } else {
      add('cron_dum', '<span data-static-slot="dum_lbl">Data da última menstruação: </span><span data-static-slot="dum_val">não informada.</span>');
    }

    if (state.cronologia.igAtiva.valid) {
      const { semanas, dias, metodo } = state.cronologia.igAtiva;
      const semTxt = semanas !== null && semanas !== undefined ? `${semanas}` : 'X';
      const diasTxt = dias !== null && dias !== undefined ? `${dias}` : '0';

      let fraseDatacao = '';
      if (metodo === 'dum') {
        fraseDatacao = `<span data-static-slot="dt_pref">Exame ultrassonográfico realizado com </span><span data-slot="ig_sem">${semTxt}</span><span data-static-slot="dt_sem"> semanas e </span><span data-slot="ig_dias">${diasTxt}</span><span data-static-slot="dt_pos"> dias de idade gestacional segundo a data da última menstruação.</span>`;
      } else if (metodo === 'primeira_usg') {
        fraseDatacao = `<span data-static-slot="dt_pref">Exame ultrassonográfico realizado com </span><span data-slot="ig_sem">${semTxt}</span><span data-static-slot="dt_sem"> semanas e </span><span data-slot="ig_dias">${diasTxt}</span><span data-static-slot="dt_pos"> dias de idade gestacional segundo exame ultrassonográfico inicial.</span>`;
      } else {
        fraseDatacao = `<span data-static-slot="dt_pref">Exame ultrassonográfico realizado com </span><span data-slot="ig_sem">${semTxt}</span><span data-static-slot="dt_sem"> semanas e </span><span data-slot="ig_dias">${diasTxt}</span><span data-static-slot="dt_pos"> dias de idade gestacional referida.</span>`;
      }
      add('cron_frase', fraseDatacao);
    } else {
      add('cron_frase', '<span data-static-slot="dt_pref">Exame ultrassonográfico realizado com </span><span data-slot="ig_sem">X</span><span data-static-slot="dt_sem"> semanas e </span><span data-slot="ig_dias">X</span><span data-static-slot="dt_pos"> dias de idade gestacional segundo a data da última menstruação.</span>');
    }
    add('sp_cron', '&nbsp;', 'report-blank-line');

    // 3. ESTÁTICA FETAL
    const dorsoMap = {
      direita: 'à direita',
      esquerda: 'à esquerda',
      anterior: 'anterior',
      posterior: 'posterior'
    };
    const sitTxt = state.estatica.situacao;
    const aprTxt = state.estatica.apresentacao === 'cefalica' ? 'cefálica' : (state.estatica.apresentacao === 'pelvica' ? 'pélvica' : 'côrmica');
    const dorTxt = dorsoMap[state.estatica.dorso] || 'à direita';

    add('estatica_feto', `<span data-static-slot="est_pref">Feto único, em situação </span><span data-slot="est_sit">${sitTxt}</span><span data-static-slot="est_apr_lbl">, apresentação </span><span data-slot="est_apr">${aprTxt}</span><span data-static-slot="est_dor_lbl"> e dorso </span><span data-slot="est_dor">${dorTxt}</span><span data-static-slot="est_pt">.</span>`);

    let movTxt = 'Movimentação fetal ativa dentro dos padrões da normalidade.';
    if (state.estatica.movimentacao === 'presente_diminuida') {
      movTxt = 'Movimentação fetal presente, porém diminuída no momento do exame.';
    } else if (state.estatica.movimentacao === 'ausente') {
      movTxt = 'Movimentação fetal ausente durante todo o período do exame.';
    }
    add('estatica_mov', `<span data-slot="est_mov">${movTxt}</span>`);
    add('sp_estatica', '&nbsp;', 'report-blank-line');

    // 4. PLACENTA E CORDÃO UMBILICAL
    add('sec_placenta', '<b>PLACENTA E CORDÃO UMBILICAL</b>', 'report-section-title');
    const espTxt = state.placenta.espessura ? `${state.placenta.espessura} mm` : 'X mm';
    add('placenta_desc', `<span data-static-slot="pla_pref">Placenta de inserção </span><span data-slot="pla_ins">${state.placenta.insercao}</span><span data-static-slot="pla_grau_lbl">. A ecogenicidade é de Grau </span><span data-slot="pla_grau">${state.placenta.grau}</span><span data-static-slot="pla_esp_lbl">, segundo Grannum, medindo </span><span data-slot="pla_esp">${espTxt}</span><span data-static-slot="pla_pos"> de espessura.</span>`);

    let cordaoTxt = 'constituído de três vasos, sem alterações.';
    if (state.placenta.cordao === 'arteria_unica') {
      cordaoTxt = 'com artéria umbilical única.';
    } else if (state.placenta.cordao === 'circular') {
      cordaoTxt = 'constituído de três vasos, com circular de cordão cervical observada.';
    }
    add('cordao_desc', `<span data-static-slot="cor_pref">Cordão umbilical </span><span data-slot="cor_desc">${cordaoTxt}</span>`);
    add('sp_placenta', '&nbsp;', 'report-blank-line');

    // 5. LÍQUIDO AMNIÓTICO (SEM CONTRADIÇÃO E FIEL ÀS MÁSCARAS)
    add('sec_liquido', '<b>LÍQUIDO AMNIÓTICO</b>', 'report-section-title');

    const classif = state.liquido.classificacao;
    if (classif === 'normal') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico normal para a idade gestacional.</span>');
    } else if (classif === 'diminuido') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico no limite inferior da normalidade para a idade gestacional.</span>');
    } else if (classif === 'oligoidramnio') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico acentuadamente diminuído (oligoidrâmnio).</span>');
    } else if (classif === 'aumentado') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico no limite superior da normalidade para a idade gestacional.</span>');
    } else if (classif === 'polidramnio') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico acentuadamente aumentado (polidrâmnio).</span>');
    }

    const mbvVal = state.liquido.maiorBolsao ? `${state.liquido.maiorBolsao}` : 'X';

    if (week < 20) {
      // Semanas 16 a 19: apenas Maior Bolsão (normal de 20 a 80 mm)
      add('liquido_mbv', `<span data-static-slot="mbv_pref">O maior bolsão vertical mede </span><span data-slot="liq_mbv">${mbvVal}</span><span data-static-slot="mbv_pos"> mm (normal de 20 a 80 mm).</span>`);
    } else {
      // Semanas 20 a 41: ILA e Maior Bolsão + citação Moore (SEM SUBSTITUIÇÃO SILENCIOSA)
      const ilaRef = TABELA_ILA_REFERENCIA[week];
      if (!ilaRef || typeof ilaRef.min !== 'number' || typeof ilaRef.max !== 'number') {
        blockWithReferenceError(week, 'limites numéricos de ILA');
        return;
      }
      const ilaVal = state.liquido.ila ? `${state.liquido.ila}` : 'X';
      const ilaRefStr = `${ilaRef.min} a ${ilaRef.max}`;

      add('liquido_valores', `<span data-static-slot="ila_lbl">ILA: </span><span data-slot="liq_ila">${ilaVal}</span><span data-static-slot="ila_mid"> mm (normal para a idade gestacional de ${ilaRefStr} mm)* e maior bolsão vertical de </span><span data-slot="liq_mbv">${mbvVal}</span><span data-static-slot="ila_pos"> mm.</span>`);
      add('p_ref_liquido', '*Moore TR, Cayle JE. Am J Obstet Gynecol. 1990 May;162(5):1168-73.', 'report-note');
    }
    add('sp_liquido', '&nbsp;', 'report-blank-line');

    // 6. MORFOLOGIA FETAL
    add('sec_morfo', '<b>MORFOLOGIA FETAL</b>', 'report-section-title');
    if (state.morfologia.padrao) {
      add('morfo_cefalico', 'Polo cefálico: calota craniana normoecogênica. Foice cerebral e plexos coróides identificados e de aspecto aparentemente normal.');
      const fcfTxt = state.bcf ? `${state.bcf}` : 'X';
      add('morfo_torax', `<span data-static-slot="morf_tor_pref">Tórax: coração identificado e normoposicionado. FCF: </span><span data-slot="fcf_val">${fcfTxt}</span><span data-static-slot="morf_tor_pos"> bpm.</span>`);
      add('morfo_abdome', 'Abdome: foram visibilizados o estômago e a bexiga.');
      add('morfo_membros', 'Membros: esqueleto apendicular com ecogenicidade adequada para a idade gestacional. Não se observam alterações grosseiras.');
      add('morfo_coluna', 'Coluna vertebral: todos os segmentos identificados e sem alterações detectáveis nesta idade gestacional.');
    } else {
      const obsMorfo = state.morfologia.obs || 'Avaliação morfológica detalhada conforme achados descritos.';
      add('morfo_custom', `<span data-slot="morfo_custom">${obsMorfo}</span>`);
    }
    add('sp_morfo', '&nbsp;', 'report-blank-line');

    // 7. BIOMETRIA FETAL
    add('sec_biometria', '<b>BIOMETRIA FETAL</b>', 'report-section-title');
    const dbpVal = state.biometria.dbp || 'X';
    const dofVal = state.biometria.dof || 'X';
    const ccVal  = state.biometria.cc  || 'X';
    const caVal  = state.biometria.ca  || 'X';
    const cfVal  = state.biometria.cf  || 'X';
    const cuVal  = state.biometria.cu  || 'X';

    add('bio_dbp', `<span data-static-slot="bio_dbp_lbl">Diâmetro biparietal (DBP): </span><span data-slot="bio_dbp">${dbpVal}</span><span data-static-slot="bio_dbp_pos"> mm.</span>`);
    add('bio_dof', `<span data-static-slot="bio_dof_lbl">Diâmetro occipitofrontal (DOF): </span><span data-slot="bio_dof">${dofVal}</span><span data-static-slot="bio_dof_pos"> mm.</span>`);
    add('bio_cc', `<span data-static-slot="bio_cc_lbl">Circunferência craniana (CC): </span><span data-slot="bio_cc">${ccVal}</span><span data-static-slot="bio_cc_pos"> mm.</span>`);
    add('bio_ca', `<span data-static-slot="bio_ca_lbl">Circunferência abdominal (CA): </span><span data-slot="bio_ca">${caVal}</span><span data-static-slot="bio_ca_pos"> mm.</span>`);
    add('bio_cf', `<span data-static-slot="bio_cf_lbl">Comprimento do fêmur (CF): </span><span data-slot="bio_cf">${cfVal}</span><span data-static-slot="bio_cf_pos"> mm.</span>`);
    add('bio_cu', `<span data-static-slot="bio_cu_lbl">Comprimento do úmero (CU): </span><span data-slot="bio_cu">${cuVal}</span><span data-static-slot="bio_cu_pos"> mm.</span>`);

    const ccCaVal = state.biometria.ccCa !== null ? formatNumBR(state.biometria.ccCa, 2) : 'X';
    add('bio_cc_ca', `<span data-static-slot="bio_cc_ca_lbl">Índice CC/CA: </span><span data-slot="bio_cc_ca">${ccCaVal}</span><span data-static-slot="bio_cc_ca_pos"> (normal para idade gestacional).</span>`);

    const icVal = state.biometria.indiceCefalico !== null ? formatNumBR(state.biometria.indiceCefalico, 1) : 'X';
    add('bio_ic', `<span data-static-slot="bio_ic_lbl">Índice cefálico DBP/DOF:  </span><span data-slot="bio_ic">${icVal}</span><span data-static-slot="bio_ic_pos"> (normal: 70 a 86).</span>`);

    const pesoVal = state.biometria.peso !== null ? `${Math.round(state.biometria.peso)}` : 'X';
    add('bio_peso', `<span data-static-slot="bio_peso_lbl">Peso fetal estimado: </span><span data-slot="bio_peso">${pesoVal}</span><span data-static-slot="bio_peso_pos"> g +/- 10%.</span>`);
    add('sp_biometria', '&nbsp;', 'report-blank-line');

    // 8. DOPPLERFLUXOMETRIA
    add('sec_doppler', '<b>DOPPLERFLUXOMETRIA</b>', 'report-section-title');

    // Tabela A. Uterinas
    const irD = state.doppler.uterinaIrD !== '' ? formatNumBR(state.doppler.uterinaIrD, 2) : 'X';
    const ipD = state.doppler.uterinaIpD !== '' ? formatNumBR(state.doppler.uterinaIpD, 2) : 'X';
    const irE = state.doppler.uterinaIrE !== '' ? formatNumBR(state.doppler.uterinaIrE, 2) : 'X';
    const ipE = state.doppler.uterinaIpE !== '' ? formatNumBR(state.doppler.uterinaIpE, 2) : 'X';

    const tblUterinasHtml = `
      <thead>
        <tr>
          <th><b>Vaso Analisado</b></th>
          <th><b>Valores IR</b></th>
          <th><b>Valores IP</b></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A. Uterina D</td>
          <td>IR: <span data-slot="ut_ir_d">${irD}</span></td>
          <td>IP: <span data-slot="ut_ip_d">${ipD}</span></td>
        </tr>
        <tr>
          <td>A. Uterina E</td>
          <td>IR: <span data-slot="ut_ir_e">${irE}</span></td>
          <td>IP: <span data-slot="ut_ip_e">${ipE}</span></td>
        </tr>
      </tbody>
    `;
    add('tbl_uterinas', tblUterinasHtml, 'doppler-table', 'table');

    // Incisura
    const incisuraMap = {
      ausente: 'Ausência de incisura protodiastólica nas artérias uterinas.',
      presente_d: 'Presença de incisura protodiastólica na artéria uterina direita.',
      presente_e: 'Presença de incisura protodiastólica na artéria uterina esquerda.',
      bilateral: 'Presença de incisura protodiastólica bilateralmente nas artérias uterinas.'
    };
    const incisuraTxt = incisuraMap[state.doppler.incisura] || incisuraMap.ausente;
    add('p_incisura', `<span data-slot="incisura_txt">${incisuraTxt}</span>`);

    // IP Médio Uterinas (SEM SUBSTITUIÇÃO SILENCIOSA)
    const refIpUt = TABELA_IP_UTERINAS[week];
    if (!refIpUt || typeof refIpUt !== 'string' || refIpUt.trim() === '') {
      blockWithReferenceError(week, 'IP médio das artérias uterinas');
      return;
    }
    const ipMedioVal = state.doppler.ipMedioUterinas !== null ? formatNumBR(state.doppler.ipMedioUterinas, 2) : 'X';
    add('p_ip_medio', `<span data-static-slot="ip_med_lbl">Índice de pulsatilidade médio das artérias uterinas: </span><span data-slot="ip_medio">${ipMedioVal}</span><span data-static-slot="ip_med_pos"> (normal para a idade gestacional &lt; ${refIpUt})*.</span>`);
    add('p_ref_uterinas', '* Gómez O, et al. Ultrasound Obstet Gynecol. 2008 Aug;32(2):128-32.', 'report-note');
    add('sp_doppler_mid', '&nbsp;', 'report-blank-line');

    // Tabela Doppler Fetal
    if (week < 20) {
      // Semanas 16 a 19: Apenas Umbilical com IR (SEM SUBSTITUIÇÃO SILENCIOSA)
      const refUmbIr = TABELA_IR_UMBILICAL[week];
      if (!refUmbIr || typeof refUmbIr !== 'string' || refUmbIr.trim() === '') {
        blockWithReferenceError(week, 'IR da artéria umbilical');
        return;
      }
      const irUmb = state.doppler.umbilicalIr !== '' ? formatNumBR(state.doppler.umbilicalIr, 2) : 'X';

      const tblUmbHtml = `
        <thead>
          <tr>
            <th><b>Vaso Analisado</b></th>
            <th><b>Valores IR</b></th>
            <th><b>Referência IR**</b></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A. Umbilical</td>
            <td>IR = <span data-slot="umb_ir">${irUmb}</span></td>
            <td>${refUmbIr}</td>
          </tr>
        </tbody>
      `;
      add('tbl_umbilical', tblUmbHtml, 'doppler-table', 'table');
      add('sp_doppler_umb', '&nbsp;', 'report-blank-line');
      add('p_ref_fetal', '**Kofinas AD, Espeland MA, Penry M, Swain M, Hatjis CG. Am J Perinatol. 1992;9(2):94-101.', 'report-note');
    } else {
      // Semanas 20 a 41: Umbilical IP + ACM IP + RCP (SEM SUBSTITUIÇÕES SILENCIOSAS)
      const refUmbIp = TABELA_IP_UMBILICAL[week];
      if (!refUmbIp || typeof refUmbIp !== 'string' || refUmbIp.trim() === '') {
        blockWithReferenceError(week, 'IP da artéria umbilical');
        return;
      }
      const refAcm = TABELA_IP_ACM[week];
      if (!refAcm || typeof refAcm !== 'string' || refAcm.trim() === '') {
        blockWithReferenceError(week, 'IP da artéria cerebral média');
        return;
      }
      const refRcp = TABELA_RCP[week];
      if (!refRcp || typeof refRcp !== 'string' || refRcp.trim() === '') {
        blockWithReferenceError(week, 'relação cerebroplacentária (RCP)');
        return;
      }

      const ipUmb = state.doppler.umbilicalIp !== '' ? formatNumBR(state.doppler.umbilicalIp, 2) : 'X';
      const ipAcm = state.doppler.acmIp !== '' ? formatNumBR(state.doppler.acmIp, 2) : 'X';

      const tblFetalHtml = `
        <thead>
          <tr>
            <th><b>Vaso Analisado</b></th>
            <th><b>Valores IP</b></th>
            <th><b>Referência IP**</b></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A. Umbilical</td>
            <td>IP = <span data-slot="umb_ip">${ipUmb}</span></td>
            <td>${refUmbIp}</td>
          </tr>
          <tr>
            <td>A. Cerebral média</td>
            <td>IP = <span data-slot="acm_ip">${ipAcm}</span></td>
            <td>${refAcm}</td>
          </tr>
        </tbody>
      `;
      add('tbl_fetal', tblFetalHtml, 'doppler-table', 'table');

      const rcpVal = state.doppler.rcp !== null ? formatNumBR(state.doppler.rcp, 2) : 'X';
      add('p_rcp', `<span data-static-slot="rcp_lbl">Relação IP Cerebral/ IP Umbilical = </span><span data-slot="rcp_val">${rcpVal}</span><span data-static-slot="rcp_pos"> (Normal &gt; ${refRcp}).</span>`);
      add('p_ref_fetal', '**Ciobanu A, Wright A, Syngelaki A, Wright D, Akolekar R, Nicolaides KH. Ultrasound Obstet Gynecol. 2019;53(4):465-472.', 'report-note');
    }
    add('sp_doppler_end', '&nbsp;', 'report-blank-line');

    // 9. CONCLUSÃO (CONFORME MODELOS ORIGINAIS DO WORD)
    add('sec_conclusao', '<b>CONCLUSÃO</b>', 'report-section-title');

    // Idade e Biometria
    const igBioSem = state.biometria.igBiometria.valid ? `${state.biometria.igBiometria.semanas}` : 'X';
    const igBioDias = state.biometria.igBiometria.valid ? `${state.biometria.igBiometria.dias}` : 'X';
    const igRefSem = state.cronologia.igAtiva.valid && state.cronologia.igAtiva.semanas !== null ? `${state.cronologia.igAtiva.semanas}` : 'XX';
    const igRefDias = state.cronologia.igAtiva.valid && state.cronologia.igAtiva.dias !== null ? `${state.cronologia.igAtiva.dias}` : 'XX';
    const margemDias = state.biometria.igBiometria.margemDias || (week >= 28 ? 21 : 14);

    // Crescimento fetal conforme seleção de selConclusaoCrescimento
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

    let hadlockPart = '';
    if (week >= 20) {
      const pVal = state.biometria.percentil !== null ? `${state.biometria.percentil}` : 'X';
      hadlockPart = ` (percentil <span data-slot="concl_p">${pVal}</span> de Hadlock)`;
    }

    let dumOrigemTexto = 'pela DUM';
    if (state.cronologia.igAtiva.metodo === 'primeira_usg') {
      dumOrigemTexto = 'pelo primeiro ultrassom';
    } else if (state.cronologia.igAtiva.metodo === 'referida') {
      dumOrigemTexto = 'pela idade gestacional referida';
    }

    add('concl_idade', `<span data-static-slot="ci_pref">- Gestação tópica, com idade gestacional estimada pela biometria do presente exame em </span><span data-slot="concl_bio_sem">${igBioSem}</span><span data-static-slot="ci_sem"> semanas e </span><span data-slot="concl_bio_dias">${igBioDias}</span><span data-static-slot="ci_dias"> dias (+/- </span><span data-slot="concl_margem">${margemDias}</span><span data-static-slot="ci_comp"> dias). Compatível com </span><span data-slot="concl_ref_sem">${igRefSem}</span><span data-static-slot="ci_ref_sem"> semanas e </span><span data-slot="concl_ref_dias">${igRefDias}</span><span data-static-slot="ci_ref_dias"> dias de idade gestacional estimada ${dumOrigemTexto}, </span><span data-slot="concl_desenv">${desenvTxt}</span>${hadlockPart}<span data-static-slot="ci_pt">.</span>`);

    // Vitalidade e Líquido (semanas 16 a 40 — NÃO aparecem na semana 41, fiel aos modelos Word)
    if (week <= 40) {
      const vitTxt = state.conclusao.vitalidade === 'reduzida' ? '- Movimentação fetal reduzida.' : '- Movimentação fetal adequada.';
      add('concl_vitalidade', `<span data-slot="concl_vit">${vitTxt}</span>`);

      let laTxt = '- Volume de líquido amniótico normal.';
      if (classif === 'diminuido') {
        laTxt = '- Volume de líquido amniótico no limite inferior da normalidade.';
      } else if (classif === 'oligoidramnio') {
        laTxt = '- Volume de líquido amniótico diminuído (oligoidrâmnio).';
      } else if (classif === 'aumentado') {
        laTxt = '- Volume de líquido amniótico no limite superior da normalidade.';
      } else if (classif === 'polidramnio') {
        laTxt = '- Volume de líquido amniótico aumentado (polidrâmnio).';
      }
      add('concl_liquido', `<span data-slot="concl_la">${laTxt}</span>`);
    }

    // Estudo Hemodinâmico Materno (Normal vs Alterado)
    const matTxt = state.conclusao.hemoMaterno === 'alterado'
      ? '- O estudo hemodinâmico materno, avaliado pela técnica da Dopplerfluxometria, apresentou alterações para a idade gestacional.'
      : '- O estudo hemodinâmico materno, avaliado pela técnica da Dopplerfluxometria, foi considerado normal para a idade gestacional.';
    add('concl_materno', `<span data-slot="concl_mat">${matTxt}</span>`);

    // Estudo Hemodinâmico Fetal (Normal vs Alterado)
    const fetTxt = state.conclusao.hemoFetal === 'alterado'
      ? '- O estudo hemodinâmico fetal, avaliado pela técnica da Dopplerfluxometria, apresentou alterações para a idade gestacional.'
      : '- O estudo hemodinâmico fetal, avaliado pela técnica da Dopplerfluxometria, foi considerado normal para a idade gestacional.';
    add('concl_fetal', `<span data-slot="concl_fet">${fetTxt}</span>`);

    // Observações adicionais
    if (state.conclusao.obs && state.conclusao.obs.trim() !== '') {
      add('concl_obs', `<span data-static-slot="c_obs_pref">- </span><span data-slot="concl_obs">${state.conclusao.obs.trim()}</span>`);
    }

    // Nota Médico-Legal ao final
    if (state.conclusao.notaFinal) {
      add('sp_concl_nota', '&nbsp;', 'report-blank-line');
      if (week === 41) {
        add('concl_nota', '<span data-slot="concl_nota">Nota: O objetivo do ultrassom obstétrico é avaliar o crescimento e a vitalidade fetal.  Não tem finalidade de rastreamento e diagnóstico de doenças genéticas e/ou malformações fetais.</span>', 'report-note');
      } else {
        add('concl_nota', '<span data-slot="concl_nota">Nota: O principal objetivo do ultrassom obstétrico é avaliar o crescimento e a vitalidade fetal. Não tem finalidade de rastreamento e diagnóstico de doenças genéticas e/ou malformações fetais. Fatores como biotipo materno, posição fetal e volume de líquido amniótico podem limitar a visibilização de algumas estruturas. A normalidade deste exame não exclui a totalidade de alterações estruturais ou genéticas.</span>', 'report-note');
      }
    }

    syncReportBlocks(blocks);
  }

  // =========================================================================
  // 12. CÓPIA FORMATADA (RICH TEXT PARA MICROSOFT WORD)
  // =========================================================================

  function showToast(msg) {
    if (!dom.toastNotice) return;
    if (dom.toastMessage) dom.toastMessage.textContent = msg;
    dom.toastNotice.classList.add('show');
    setTimeout(() => {
      dom.toastNotice.classList.remove('show');
    }, 3200);
  }

  function copyReportRichText() {
    if (!dom.reportPaper) return;
    if (!state.semanaAtiva) {
      showToast('Defina a idade gestacional na Seção 1 para gerar e copiar o laudo.');
      return;
    }

    const paperClone = dom.reportPaper.cloneNode(true);
    paperClone.querySelectorAll('.report-blank-line').forEach(el => {
      el.innerHTML = '&nbsp;';
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.25; color: #000000; }
          p { margin: 0 0 0 0; padding: 0; line-height: 1.25; }
          .report-title { text-align: center; font-weight: bold; }
          .report-section-title { font-weight: bold; text-transform: uppercase; }
          .report-note { font-size: 10pt; color: #1a1a1a; }
          table.doppler-table { border-collapse: collapse; width: 100%; margin: 6px 0; }
          table.doppler-table th, table.doppler-table td { border: 1px solid #000000; padding: 3px 6px; font-family: Arial, sans-serif; font-size: 11pt; }
          table.doppler-table th { font-weight: bold; text-align: left; }
        </style>
      </head>
      <body>
        ${paperClone.innerHTML}
      </body>
      </html>
    `;

    const plainText = dom.reportPaper.innerText;

    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });

      navigator.clipboard.write([item]).then(() => {
        showToast('Laudo copiado com tabelas e formatação rica para o Word!');
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(dom.reportPaper);
      sel.removeAllRanges();
      sel.addRange(range);
      try {
        document.execCommand('copy');
        showToast('Laudo copiado com formatação rica para o Word!');
      } catch (err) {
        showToast('Não foi possível copiar automaticamente.');
      }
      sel.removeAllRanges();
    }
  }

  // =========================================================================
  // 13. RESET E INICIALIZAÇÃO DE ESTADO
  // =========================================================================

  function resetToDefault() {
    const activeWeek = state.semanaAtiva;

    state.isManualEdit = false;
    state.manualEditBlocks.clear();
    state.deletedBlocks.clear();
    state.lastGeneratedBlocks = {};
    state.userEditedSlots = {};
    state.lastGeneratedSlots = {};

    state.cronologia = {
      dumStatus: 'sim',
      dum: '',
      dumCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      dumPadrao: true,
      metodoAlternativo: 'primeira_usg',
      primeiraUsgData: '',
      primeiraUsgSem: '',
      primeiraUsgDias: '',
      primeiraUsgCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      igReferidaSem: '',
      igReferidaDias: '',
      igAtiva: { valid: false, semanas: null, dias: null, metodo: null, origemTexto: '', dpp: '' }
    };

    state.estatica = {
      situacao: 'longitudinal',
      apresentacao: 'cefalica',
      dorso: 'direita',
      movimentacao: 'ativa_normal'
    };

    state.bcf = '';

    state.placenta = {
      insercao: 'corporal anterior',
      grau: 'I',
      espessura: '',
      cordao: 'tres_vasos'
    };

    state.liquido = {
      ila: '',
      maiorBolsao: '',
      classificacao: 'normal',
      statusRef: 'aguardando'
    };

    state.morfologia = {
      padrao: true,
      obs: ''
    };

    state.biometria = {
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
    };

    state.doppler = {
      uterinaIrD: '',
      uterinaIpD: '',
      uterinaIrE: '',
      uterinaIpE: '',
      ipMedioUterinas: null,
      incisura: 'ausente',
      umbilicalIr: '',
      umbilicalIp: '',
      acmIp: '',
      rcp: null
    };

    state.conclusao = {
      crescimento: 'adequado',
      vitalidade: 'adequada',
      hemoMaterno: 'normal',
      hemoFetal: 'normal',
      obs: '',
      notaFinal: true
    };

    // Restaurar inputs do DOM
    if (dom.selDumStatus) dom.selDumStatus.value = 'sim';
    if (dom.containerDum) dom.containerDum.style.display = 'block';
    if (dom.inputDum) dom.inputDum.value = '';
    if (dom.dumFeedbackBox) dom.dumFeedbackBox.style.display = 'none';
    if (dom.btnDumPadraoSim) dom.btnDumPadraoSim.classList.add('active');
    if (dom.btnDumPadraoNao) dom.btnDumPadraoNao.classList.remove('active');

    if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'none';
    if (dom.btnMetodoPrimeiraUsg) dom.btnMetodoPrimeiraUsg.classList.add('active');
    if (dom.btnMetodoReferida) dom.btnMetodoReferida.classList.remove('active');
    if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'block';
    if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'none';
    if (dom.inputPrimeiraUsgData) dom.inputPrimeiraUsgData.value = '';
    if (dom.inputPrimeiraUsgSem) dom.inputPrimeiraUsgSem.value = '';
    if (dom.inputPrimeiraUsgDias) dom.inputPrimeiraUsgDias.value = '';
    if (dom.primeiraUsgFeedbackBox) dom.primeiraUsgFeedbackBox.style.display = 'none';
    if (dom.inputIgReferidaSem) dom.inputIgReferidaSem.value = '';
    if (dom.inputIgReferidaDias) dom.inputIgReferidaDias.value = '';
    if (dom.displayIgVigente) dom.displayIgVigente.style.display = 'none';

    if (dom.selSituacao) dom.selSituacao.value = 'longitudinal';
    if (dom.selApresentacao) dom.selApresentacao.value = 'cefalica';
    if (dom.selDorso) dom.selDorso.value = 'direita';
    if (dom.selMovimentacao) dom.selMovimentacao.value = 'ativa_normal';

    if (dom.inputFcf) dom.inputFcf.value = '';

    if (dom.selPlacentaInsercao) dom.selPlacentaInsercao.value = 'corporal anterior';
    if (dom.selPlacentaGrau) dom.selPlacentaGrau.value = 'I';
    if (dom.inputPlacentaEspessura) dom.inputPlacentaEspessura.value = '';
    if (dom.selCordao) dom.selCordao.value = 'tres_vasos';

    if (dom.inputIla) dom.inputIla.value = '';
    if (dom.inputMaiorBolsao) dom.inputMaiorBolsao.value = '';
    if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
    if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
    if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';

    if (dom.btnMorfoPadrao) dom.btnMorfoPadrao.classList.add('active');
    if (dom.btnMorfoPersonalizada) dom.btnMorfoPersonalizada.classList.remove('active');
    if (dom.morfoPadraoInfo) dom.morfoPadraoInfo.style.display = 'block';
    if (dom.morfoPersonalizadaPanel) dom.morfoPersonalizadaPanel.style.display = 'none';
    if (dom.inputMorfoObs) dom.inputMorfoObs.value = '';

    if (dom.inputDbp) dom.inputDbp.value = '';
    if (dom.inputDof) dom.inputDof.value = '';
    if (dom.inputCc) dom.inputCc.value = '';
    if (dom.inputCa) dom.inputCa.value = '';
    if (dom.inputCf) dom.inputCf.value = '';
    if (dom.inputCu) dom.inputCu.value = '';
    if (dom.displayCcCa) dom.displayCcCa.style.display = 'none';
    if (dom.displayDbfDof) dom.displayDbfDof.style.display = 'none';
    if (dom.displayPesoFetal) dom.displayPesoFetal.style.display = 'none';
    if (dom.displayPercentilPeso) dom.displayPercentilPeso.style.display = 'none';
    if (dom.displayIgBiometria) dom.displayIgBiometria.style.display = 'none';

    if (dom.inputUterinaIrD) dom.inputUterinaIrD.value = '';
    if (dom.inputUterinaIpD) dom.inputUterinaIpD.value = '';
    if (dom.inputUterinaIrE) dom.inputUterinaIrE.value = '';
    if (dom.inputUterinaIpE) dom.inputUterinaIpE.value = '';
    if (dom.displayIpMedioUterinas) dom.displayIpMedioUterinas.style.display = 'none';
    if (dom.selIncisura) dom.selIncisura.value = 'ausente';

    if (dom.inputUmbilicalIr) dom.inputUmbilicalIr.value = '';
    if (dom.inputUmbilicalIp) dom.inputUmbilicalIp.value = '';
    if (dom.inputAcmIp) dom.inputAcmIp.value = '';
    if (dom.displayRcp) dom.displayRcp.style.display = 'none';

    if (dom.selConclusaoCrescimento) dom.selConclusaoCrescimento.value = 'adequado';
    if (dom.selConclusaoVitalidade) dom.selConclusaoVitalidade.value = 'adequada';
    if (dom.selHemoMaterno) dom.selHemoMaterno.value = 'normal';
    if (dom.selHemoFetal) dom.selHemoFetal.value = 'normal';
    if (dom.inputConclusaoObs) dom.inputConclusaoObs.value = '';
    if (dom.btnNotaFinalSim) dom.btnNotaFinalSim.classList.add('active');
    if (dom.btnNotaFinalNao) dom.btnNotaFinalNao.classList.remove('active');

    if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'none';
    if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
    if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';

    if (dom.displaySemanaDoppler) dom.displaySemanaDoppler.textContent = 'Aguardando datação';
    if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'none';
    if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
    if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Aguardando Idade Gestacional';

    state.semanaAtiva = null;
    state.semanaInvalidaInfo = null;
    state.currentRenderedWeek = null;

    if (dom.inputDum && dom.inputDum.value) {
      handleDumInput();
    } else if (dom.inputPrimeiraUsgData && dom.inputPrimeiraUsgData.value) {
      handlePrimeiraUsgInput();
    } else {
      updateActiveGestationalAge();
    }
  }

  // =========================================================================
  // 14. GERENCIAMENTO DE EVENTOS DA INTERFACE
  // =========================================================================

  function initEvents() {
    // Tema claro / escuro
    if (dom.themeToggleBtn) {
      dom.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Cronologia — DUM Status
    if (dom.selDumStatus) {
      dom.selDumStatus.addEventListener('change', () => {
        state.cronologia.dumStatus = dom.selDumStatus.value;
        if (state.cronologia.dumStatus === 'sim') {
          if (dom.containerDum) dom.containerDum.style.display = 'block';
          if (!state.cronologia.dumPadrao && dom.containerDatacaoAlternativa) {
            dom.containerDatacaoAlternativa.style.display = 'block';
          }
        } else {
          if (dom.containerDum) dom.containerDum.style.display = 'none';
          if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'block';
        }
        updateActiveGestationalAge();
      });
    }

    // Máscara e cálculo de DUM
    if (dom.inputDum) {
      dom.inputDum.addEventListener('input', (e) => {
        e.target.value = applyDateMask(e.target.value);
        state.cronologia.dum = e.target.value;
        const parsed = parseDateBR(e.target.value);
        if (parsed) {
          const calc = calculateGestationalAgeByDum(parsed);
          state.cronologia.dumCalculada = calc;
          if (calc.valid && dom.dumFeedbackBox && dom.dumIgDisplay) {
            dom.dumIgDisplay.textContent = `${calc.semanas} semanas e ${calc.dias} dias (DPP: ${calc.dpp})`;
            dom.dumFeedbackBox.style.display = 'flex';
          } else if (dom.dumFeedbackBox) {
            dom.dumFeedbackBox.style.display = 'none';
          }
        } else {
          state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
          if (dom.dumFeedbackBox) dom.dumFeedbackBox.style.display = 'none';
        }
        updateActiveGestationalAge();
      });
    }

    // Usar DUM como padrão SIM / NÃO
    if (dom.btnDumPadraoSim) {
      dom.btnDumPadraoSim.addEventListener('click', () => {
        state.cronologia.dumPadrao = true;
        dom.btnDumPadraoSim.classList.add('active');
        if (dom.btnDumPadraoNao) dom.btnDumPadraoNao.classList.remove('active');
        if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'none';
        updateActiveGestationalAge();
      });
    }

    if (dom.btnDumPadraoNao) {
      dom.btnDumPadraoNao.addEventListener('click', () => {
        state.cronologia.dumPadrao = false;
        dom.btnDumPadraoNao.classList.add('active');
        if (dom.btnDumPadraoSim) dom.btnDumPadraoSim.classList.remove('active');
        if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'block';
        updateActiveGestationalAge();
      });
    }

    // Métodos Alternativos de Datação
    if (dom.btnMetodoPrimeiraUsg) {
      dom.btnMetodoPrimeiraUsg.addEventListener('click', () => {
        state.cronologia.metodoAlternativo = 'primeira_usg';
        dom.btnMetodoPrimeiraUsg.classList.add('active');
        if (dom.btnMetodoReferida) dom.btnMetodoReferida.classList.remove('active');
        if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'block';
        if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'none';
        updateActiveGestationalAge();
      });
    }

    if (dom.btnMetodoReferida) {
      dom.btnMetodoReferida.addEventListener('click', () => {
        state.cronologia.metodoAlternativo = 'referida';
        dom.btnMetodoReferida.classList.add('active');
        if (dom.btnMetodoPrimeiraUsg) dom.btnMetodoPrimeiraUsg.classList.remove('active');
        if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'none';
        if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'block';
        updateActiveGestationalAge();
      });
    }

    // 1ª Ultrassonografia
    function handlePrimeiraUsgChange() {
      const dataStr = dom.inputPrimeiraUsgData ? dom.inputPrimeiraUsgData.value : '';
      const semVal  = dom.inputPrimeiraUsgSem ? dom.inputPrimeiraUsgSem.value : '';
      const diasVal = dom.inputPrimeiraUsgDias ? dom.inputPrimeiraUsgDias.value : '';

      state.cronologia.primeiraUsgData = dataStr;
      state.cronologia.primeiraUsgSem  = semVal;
      state.cronologia.primeiraUsgDias = diasVal;

      const dateObj = parseDateBR(dataStr);
      if (dateObj && semVal !== '') {
        const semNum = parseInt(semVal, 10);
        const diasNum = diasVal !== '' ? parseInt(diasVal, 10) : 0;
        const calc = calculateGestationalAgeByInitialExam(dateObj, semNum, diasNum);
        state.cronologia.primeiraUsgCalculada = calc;

        if (calc.valid && dom.primeiraUsgFeedbackBox && dom.primeiraUsgIgDisplay) {
          dom.primeiraUsgIgDisplay.textContent = `${calc.semanas} semanas e ${calc.dias} dias (DPP: ${calc.dpp})`;
          dom.primeiraUsgFeedbackBox.style.display = 'flex';
        } else if (dom.primeiraUsgFeedbackBox) {
          dom.primeiraUsgFeedbackBox.style.display = 'none';
        }
      } else {
        state.cronologia.primeiraUsgCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
        if (dom.primeiraUsgFeedbackBox) dom.primeiraUsgFeedbackBox.style.display = 'none';
      }
      updateActiveGestationalAge();
    }

    if (dom.inputPrimeiraUsgData) {
      dom.inputPrimeiraUsgData.addEventListener('input', (e) => {
        e.target.value = applyDateMask(e.target.value);
        handlePrimeiraUsgChange();
      });
    }
    if (dom.inputPrimeiraUsgSem) dom.inputPrimeiraUsgSem.addEventListener('input', handlePrimeiraUsgChange);
    if (dom.inputPrimeiraUsgDias) dom.inputPrimeiraUsgDias.addEventListener('input', handlePrimeiraUsgChange);

    // IG Referida
    function handleIgReferidaChange() {
      state.cronologia.igReferidaSem = dom.inputIgReferidaSem ? dom.inputIgReferidaSem.value : '';
      state.cronologia.igReferidaDias = dom.inputIgReferidaDias ? dom.inputIgReferidaDias.value : '';
      updateActiveGestationalAge();
    }
    if (dom.inputIgReferidaSem) dom.inputIgReferidaSem.addEventListener('input', handleIgReferidaChange);
    if (dom.inputIgReferidaDias) dom.inputIgReferidaDias.addEventListener('input', handleIgReferidaChange);

    // Estática Fetal
    if (dom.selSituacao) {
      dom.selSituacao.addEventListener('change', () => {
        state.estatica.situacao = dom.selSituacao.value;
        renderReportText();
      });
    }
    if (dom.selApresentacao) {
      dom.selApresentacao.addEventListener('change', () => {
        state.estatica.apresentacao = dom.selApresentacao.value;
        renderReportText();
      });
    }
    if (dom.selDorso) {
      dom.selDorso.addEventListener('change', () => {
        state.estatica.dorso = dom.selDorso.value;
        renderReportText();
      });
    }
    if (dom.selMovimentacao) {
      dom.selMovimentacao.addEventListener('change', () => {
        state.estatica.movimentacao = dom.selMovimentacao.value;
        renderReportText();
      });
    }

    // FCF
    if (dom.inputFcf) {
      dom.inputFcf.addEventListener('input', (e) => {
        state.bcf = e.target.value;
        renderReportText();
      });
    }

    // Placenta
    if (dom.selPlacentaInsercao) {
      dom.selPlacentaInsercao.addEventListener('change', () => {
        state.placenta.insercao = dom.selPlacentaInsercao.value;
        renderReportText();
      });
    }
    if (dom.selPlacentaGrau) {
      dom.selPlacentaGrau.addEventListener('change', () => {
        state.placenta.grau = dom.selPlacentaGrau.value;
        renderReportText();
      });
    }
    if (dom.inputPlacentaEspessura) {
      dom.inputPlacentaEspessura.addEventListener('input', (e) => {
        state.placenta.espessura = e.target.value;
        renderReportText();
      });
    }
    if (dom.selCordao) {
      dom.selCordao.addEventListener('change', () => {
        state.placenta.cordao = dom.selCordao.value;
        renderReportText();
      });
    }

    // Líquido Amniótico
    if (dom.inputIla) {
      dom.inputIla.addEventListener('input', (e) => {
        state.liquido.ila = e.target.value;
        updateIlaReference();
        renderReportText();
      });
    }
    if (dom.inputMaiorBolsao) {
      dom.inputMaiorBolsao.addEventListener('input', (e) => {
        state.liquido.maiorBolsao = e.target.value;
        renderReportText();
      });
    }
    if (dom.selIlaClassificacao) {
      dom.selIlaClassificacao.addEventListener('change', () => {
        state.liquido.classificacao = dom.selIlaClassificacao.value;
        renderReportText();
      });
    }

    // Morfologia Fetal
    if (dom.btnMorfoPadrao) {
      dom.btnMorfoPadrao.addEventListener('click', () => {
        state.morfologia.padrao = true;
        dom.btnMorfoPadrao.classList.add('active');
        if (dom.btnMorfoPersonalizada) dom.btnMorfoPersonalizada.classList.remove('active');
        if (dom.morfoPadraoInfo) dom.morfoPadraoInfo.style.display = 'block';
        if (dom.morfoPersonalizadaPanel) dom.morfoPersonalizadaPanel.style.display = 'none';
        renderReportText();
      });
    }
    if (dom.btnMorfoPersonalizada) {
      dom.btnMorfoPersonalizada.addEventListener('click', () => {
        state.morfologia.padrao = false;
        dom.btnMorfoPersonalizada.classList.add('active');
        if (dom.btnMorfoPadrao) dom.btnMorfoPadrao.classList.remove('active');
        if (dom.morfoPadraoInfo) dom.morfoPadraoInfo.style.display = 'none';
        if (dom.morfoPersonalizadaPanel) dom.morfoPersonalizadaPanel.style.display = 'block';
        renderReportText();
      });
    }
    if (dom.inputMorfoObs) {
      dom.inputMorfoObs.addEventListener('input', (e) => {
        state.morfologia.obs = e.target.value;
        renderReportText();
      });
    }

    // Biometria Fetal
    const bioInputs = [
      { el: dom.inputDbp, key: 'dbp' },
      { el: dom.inputDof, key: 'dof' },
      { el: dom.inputCc,  key: 'cc'  },
      { el: dom.inputCa,  key: 'ca'  },
      { el: dom.inputCf,  key: 'cf'  },
      { el: dom.inputCu,  key: 'cu'  }
    ];
    bioInputs.forEach(item => {
      if (item.el) {
        item.el.addEventListener('input', (e) => {
          state.biometria[item.key] = e.target.value;
          calculateBiometry();
          renderReportText();
        });
      }
    });

    // Dopplerfluxometria
    if (dom.inputUterinaIrD) {
      dom.inputUterinaIrD.addEventListener('input', (e) => {
        state.doppler.uterinaIrD = e.target.value;
        renderReportText();
      });
    }
    if (dom.inputUterinaIpD) {
      dom.inputUterinaIpD.addEventListener('input', (e) => {
        state.doppler.uterinaIpD = e.target.value;
        calculateDoppler();
        renderReportText();
      });
    }
    if (dom.inputUterinaIrE) {
      dom.inputUterinaIrE.addEventListener('input', (e) => {
        state.doppler.uterinaIrE = e.target.value;
        renderReportText();
      });
    }
    if (dom.inputUterinaIpE) {
      dom.inputUterinaIpE.addEventListener('input', (e) => {
        state.doppler.uterinaIpE = e.target.value;
        calculateDoppler();
        renderReportText();
      });
    }
    if (dom.selIncisura) {
      dom.selIncisura.addEventListener('change', () => {
        state.doppler.incisura = dom.selIncisura.value;
        renderReportText();
      });
    }
    if (dom.inputUmbilicalIr) {
      dom.inputUmbilicalIr.addEventListener('input', (e) => {
        state.doppler.umbilicalIr = e.target.value;
        renderReportText();
      });
    }
    if (dom.inputUmbilicalIp) {
      dom.inputUmbilicalIp.addEventListener('input', (e) => {
        state.doppler.umbilicalIp = e.target.value;
        calculateDoppler();
        renderReportText();
      });
    }
    if (dom.inputAcmIp) {
      dom.inputAcmIp.addEventListener('input', (e) => {
        state.doppler.acmIp = e.target.value;
        calculateDoppler();
        renderReportText();
      });
    }

    // Conclusão — Crescimento fetal
    if (dom.selConclusaoCrescimento) {
      dom.selConclusaoCrescimento.addEventListener('change', () => {
        state.conclusao.crescimento = dom.selConclusaoCrescimento.value;
        renderReportText();
      });
    }

    // Conclusão — Vitalidade
    if (dom.selConclusaoVitalidade) {
      dom.selConclusaoVitalidade.addEventListener('change', () => {
        state.conclusao.vitalidade = dom.selConclusaoVitalidade.value;
        renderReportText();
      });
    }

    // Conclusão — Hemodinâmica Materna
    if (dom.selHemoMaterno) {
      dom.selHemoMaterno.addEventListener('change', () => {
        state.conclusao.hemoMaterno = dom.selHemoMaterno.value;
        renderReportText();
      });
    }

    // Conclusão — Hemodinâmica Fetal
    if (dom.selHemoFetal) {
      dom.selHemoFetal.addEventListener('change', () => {
        state.conclusao.hemoFetal = dom.selHemoFetal.value;
        renderReportText();
      });
    }

    if (dom.inputConclusaoObs) {
      dom.inputConclusaoObs.addEventListener('input', (e) => {
        state.conclusao.obs = e.target.value;
        renderReportText();
      });
    }
    if (dom.btnNotaFinalSim) {
      dom.btnNotaFinalSim.addEventListener('click', () => {
        state.conclusao.notaFinal = true;
        dom.btnNotaFinalSim.classList.add('active');
        if (dom.btnNotaFinalNao) dom.btnNotaFinalNao.classList.remove('active');
        renderReportText();
      });
    }
    if (dom.btnNotaFinalNao) {
      dom.btnNotaFinalNao.addEventListener('click', () => {
        state.conclusao.notaFinal = false;
        dom.btnNotaFinalNao.classList.add('active');
        if (dom.btnNotaFinalSim) dom.btnNotaFinalSim.classList.remove('active');
        renderReportText();
      });
    }

    // Edição manual do laudo (contenteditable)
    function handleReportPaperInput(e) {
      if (!dom.reportPaper) return;

      const activeEl = getActiveCaretElement(dom.reportPaper) ||
                       (e && e.target && e.target !== dom.reportPaper && dom.reportPaper.contains(e.target) ? e.target : null);

      if (activeEl && activeEl !== dom.reportPaper) {
        const slotEl = activeEl.closest ? activeEl.closest('[data-slot], [data-static-slot]') : null;
        const blockEl = activeEl.closest ? activeEl.closest('[data-block]') : null;

        if (slotEl && blockEl && dom.reportPaper.contains(blockEl)) {
          const blockId = blockEl.getAttribute('data-block');
          const slotKey = getSlotKeyFromElement(slotEl);
          if (blockId && slotKey) {
            if (!state.userEditedSlots[blockId]) state.userEditedSlots[blockId] = new Set();
            state.userEditedSlots[blockId].add(slotKey);
          }
        } else if (blockEl && dom.reportPaper.contains(blockEl)) {
          const blockId = blockEl.getAttribute('data-block');
          const genSlots = state.lastGeneratedSlots[blockId];
          const hasKnownSlots = genSlots && Object.keys(genSlots).length > 0;
          if (!hasKnownSlots && blockId) {
            state.manualEditBlocks.add(blockId);
            blockEl.setAttribute('data-manual-edit', 'true');
          }
        } else {
          activeEl.setAttribute('data-custom', 'true');
        }
      }

      const domBlocks = dom.reportPaper.querySelectorAll(':scope > [data-block]');
      const existingBlockIds = new Set();

      domBlocks.forEach(blockEl => {
        const blockId = blockEl.getAttribute('data-block');
        if (!blockId) return;
        existingBlockIds.add(blockId);

        const genSlots = state.lastGeneratedSlots[blockId];
        if (genSlots && Object.keys(genSlots).length > 0) {
          Object.keys(genSlots).forEach(slotKey => {
            const expectedVal = genSlots[slotKey];
            const slotEl = findSlotElement(blockEl, slotKey);
            if (!slotEl) {
              if (!state.userEditedSlots[blockId]) state.userEditedSlots[blockId] = new Set();
              state.userEditedSlots[blockId].add(slotKey);
            } else {
              const currentVal = slotEl.innerHTML;
              if (normalizeContent(currentVal) !== normalizeContent(expectedVal)) {
                if (!state.userEditedSlots[blockId]) state.userEditedSlots[blockId] = new Set();
                state.userEditedSlots[blockId].add(slotKey);
              }
            }
          });
        } else {
          if (state.lastGeneratedBlocks[blockId] !== undefined) {
            if (normalizeContent(blockEl.innerHTML) !== normalizeContent(state.lastGeneratedBlocks[blockId])) {
              state.manualEditBlocks.add(blockId);
              blockEl.setAttribute('data-manual-edit', 'true');
            }
          }
        }
      });

      const seen = new Set();
      dom.reportPaper.querySelectorAll('[data-block]').forEach(el => {
        const bid = el.getAttribute('data-block');
        if (seen.has(bid)) {
          el.removeAttribute('data-block');
          el.setAttribute('data-custom', 'true');
          el.querySelectorAll('[data-slot], [data-static-slot]').forEach(s => {
            s.removeAttribute('data-slot');
            s.removeAttribute('data-static-slot');
          });
        } else {
          seen.add(bid);
        }
      });

      Object.keys(state.lastGeneratedBlocks).forEach(id => {
        if (!existingBlockIds.has(id)) {
          state.deletedBlocks.add(id);
        }
      });

      updateManualEditStatus();
    }

    if (dom.reportPaper) {
      dom.reportPaper.addEventListener('input', handleReportPaperInput);
      dom.reportPaper.addEventListener('paste', () => setTimeout(handleReportPaperInput, 10));
      dom.reportPaper.addEventListener('cut', () => setTimeout(handleReportPaperInput, 10));
    }

    // Restaurar Laudo Dinâmico
    if (dom.btnRestaurarLaudo) {
      dom.btnRestaurarLaudo.addEventListener('click', () => {
        state.isManualEdit = false;
        state.manualEditBlocks.clear();
        state.deletedBlocks.clear();
        state.lastGeneratedBlocks = {};
        state.userEditedSlots     = {};
        state.lastGeneratedSlots  = {};
        if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'none';
        if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
        if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';
        dom.reportPaper.innerHTML = '';
        renderReportText();
        showToast('Laudo restaurado e sincronizado com os dados do formulário.');
      });
    }

    // Copiar Laudo
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
  // 15. CONTROLE DE TEMA (CLARO / ESCURO)
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
  // 16. INICIALIZAÇÃO DA SEMANA ATIVA VIA NAVEGAÇÃO COM VALIDAÇÃO DE tipoExame
  // =========================================================================

  function initWeekFromNavigation() {
    let navData = null;
    let tipoExame = null;

    // 1. Ler dados de navegação do sessionStorage ('meuultrassom_nav_data')
    try {
      const raw = sessionStorage.getItem('meuultrassom_nav_data');
      if (raw) {
        navData = JSON.parse(raw);
        if (navData && typeof navData === 'object') {
          tipoExame = navData.tipoExame;
        }
      }
    } catch (e) {
      navData = null;
    }

    // 2. Validação obrigatória do tipo de exame: aceitar somente 'doppler'
    // Não reutiliza dados antigos de navegação de outros módulos (ex: 'simples' ou 'inicial')
    if (tipoExame !== 'doppler') {
      state.semanaAtiva = null;
      if (dom.errorScreen) {
        dom.errorScreen.style.display = 'flex';
        if (dom.errorScreenMsg) {
          dom.errorScreenMsg.textContent = 'Acesso bloqueado: Este módulo requer a seleção do exame "Obstétrico com Doppler" na tela inicial. Dados de outros exames ou navegação ausente não são permitidos.';
        }
      }
      if (dom.mainWrapper) dom.mainWrapper.style.display = 'none';
      return false;
    }

    // 3. Acesso autorizado ao módulo Doppler
    if (dom.errorScreen) dom.errorScreen.style.display = 'none';
    if (dom.mainWrapper) dom.mainWrapper.style.display = 'grid';

    // 4. Aproveitar idade gestacional pré-calculada na tela inicial, se houver
    if (navData && navData.igCalculada && navData.igCalculada.valid) {
      const calc = navData.igCalculada;
      if (calc.metodo === 'dum' && calc.dumDate && dom.inputDum) {
        dom.inputDum.value = calc.dumDate;
        state.cronologia.dum = calc.dumDate;
        state.cronologia.dumStatus = 'sim';
        state.cronologia.dumPadrao = true;
      } else if (calc.metodo === 'primeira_usg' && dom.inputPrimeiraUsgData) {
        state.cronologia.dumStatus = 'nao';
        state.cronologia.dumPadrao = false;
        state.cronologia.metodoAlternativo = 'primeira_usg';
        if (dom.selDumStatus) dom.selDumStatus.value = 'nao';
        if (dom.containerDum) dom.containerDum.style.display = 'none';
        if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'block';
        if (dom.btnMetodoPrimeiraUsg) dom.btnMetodoPrimeiraUsg.classList.add('active');
        if (dom.btnMetodoReferida) dom.btnMetodoReferida.classList.remove('active');
        if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'block';
        if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'none';
        dom.inputPrimeiraUsgData.value = calc.usgDate || '';
        dom.inputPrimeiraUsgSem.value = calc.usgWeeks || '';
        dom.inputPrimeiraUsgDias.value = calc.usgDays || '';
      }
    }

    return true;
  }

  // =========================================================================
  // 17. INICIALIZAÇÃO DO MÓDULO
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    initDom();
    initTheme();

    const ok = initWeekFromNavigation();
    if (ok) {
      resetToDefault();
      initEvents();
    }
  });

  // Exportação para escopo controlado (testes manuais)
  window.meuultrassomDoppler = {
    state,
    calculateBiometry,
    calculateDoppler,
    renderReportText,
    resetToDefault,
    copyReportRichText,
    validateWeekAndReferences
  };

})();
