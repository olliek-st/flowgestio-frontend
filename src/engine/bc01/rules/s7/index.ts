import type { RuleSet } from "../../types/rule.types";
import { rule_7_1_BLOCK_01 } from "./7.1-block-01";
import { rule_7_4_BLOCK_01 } from "./7.4-block-01";
import { rule_7_4_BLOCK_02 } from "./7.4-block-02";
import { rule_7_4_WARN_01 } from "./7.4-warn-01";

export const s7Rules: RuleSet = {
  section: "S7",
  rules: [rule_7_1_BLOCK_01, rule_7_4_BLOCK_01, rule_7_4_BLOCK_02, rule_7_4_WARN_01],
};
