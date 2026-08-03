/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface PresetOption {
  id: string;
  label: string;
  prompt: string;
}


export type AnalysisVerdict = 'Yes' | 'No' | 'Tight';

export interface AnalysisResult {
  verdict: AnalysisVerdict;
  explanation: string;
}