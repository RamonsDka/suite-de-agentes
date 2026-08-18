import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { IntegrationPlan } from "../../core/skill-package.ts";
import { FieldRow, SectionPanel, SelectableRow } from "../visual-primitives.tsx";

export function integrationPlanRows(plan: IntegrationPlan): readonly (readonly [string, string])[] { return [["Skill", plan.pkg.id], ["Agente", plan.agentId], ["Archivos", plan.paths.join(", ")]]; }

export function PlanReview(props: { theme: TuiTheme; plan: IntegrationPlan; approved: boolean; onApprove(): void }): JSX.Element {
  return <SectionPanel theme={props.theme} title="Plan de integración">
    {integrationPlanRows(props.plan).map(([label, value]) => <FieldRow theme={props.theme} label={label} value={value} />)}
    <SelectableRow theme={props.theme} selected={!props.approved} onActivate={props.onApprove}>Aprobar instalación</SelectableRow>
  </SectionPanel>;
}
