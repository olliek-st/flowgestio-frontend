// src/data/documentRegistry.js

export const DOCUMENT_REGISTRY = [
  {
    id: 'BC-01-P1',
    category: 'governance',
    name: 'Business Case (TBS Phase 1)',
    description: 'Treasury Board compliant business case',
    icon: '📊',
    enabled: true,
    mapper: 'UniversalToBC01Mapper',
    wizard: 'BC01Wizard'
  },
  {
    id: 'PC-01',
    category: 'initiation',
    name: 'Project Charter',
    description: 'PMI/PMBOK Project Charter',
    icon: '📜',
    enabled: false, // Coming soon
    mapper: 'UniversalToPC01Mapper',
    wizard: 'PC01Wizard'
  },
  // ... more documents
];