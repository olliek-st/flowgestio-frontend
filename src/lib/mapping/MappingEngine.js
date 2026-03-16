// src/lib/mapping/MappingEngine.js

import { UniversalToBC01Mapper } from "../mappings/UniversalToBC01Mapper";

class MappingEngine {
  constructor() {
    this.mappers = {
	  'BC-01-P1': new UniversalToBC01Mapper(),
	  'BC-01': new UniversalToBC01Mapper(),     // ← AJOUTER
	};
  }

  hasMapper(documentId) {
    return Boolean(this.mappers[documentId]);
  }

  applyMapping(universalData, documentId) {
    if (!documentId) {
      throw new Error("[MappingEngine] documentId is required");
    }

    if (!universalData || typeof universalData !== "object") {
      throw new Error("[MappingEngine] universalData is missing or invalid");
    }

    const mapper = this.mappers[documentId];
    if (!mapper) {
      throw new Error(
        `[MappingEngine] No mapper registered for documentId: ${documentId}`
      );
    }

    return mapper.map(universalData);
  }
}

// Singleton
export const mappingEngine = new MappingEngine();
