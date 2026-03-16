import industryPresets from "./compliance/industry_presets.v1.json";
import bc01Rules from "./compliance/bc01.rules.v1.json";
import sourceRefs from "./compliance/source_refs.v1.json";

export const CONFIG_V1 = {
  industryPresets,
  rulesByDocType: {
    BC01: bc01Rules
  },
  sourceRefs
};
