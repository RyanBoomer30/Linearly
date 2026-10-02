import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { CodeBlock } from '../../../components/display/CodeBlock';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { pythonCode, type PythonOptions } from '../models';
import { useLessonData } from '../useLessonData';
import { Controls } from './Controls';

/** §6.7 */
export function PythonView() {
  const [options, setOptions] = useState<PythonOptions>({ matplotlib: false, lstsq: false });
  const code = useLessonData((d) => pythonCode(d, options), [options]);
  const toggle = (key: keyof PythonOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§2.4">The same fit in NumPy: solve the normal equation with np.linalg.solve.</Caption>
          <label>
            <input type="checkbox" checked={options.matplotlib} onChange={() => toggle('matplotlib')} /> Plot the data and
            the model (matplotlib)
          </label>
          <label>
            <input type="checkbox" checked={options.lstsq} onChange={() => toggle('lstsq')} /> Also show np.linalg.lstsq
          </label>
        </Controls>
      }
    >
      {code.ok ? (
        <>
          <CodeBlock label="Least squares via the normal equation" code={code.value.solve} />
          {code.value.matplotlib && <CodeBlock label="Plot" code={code.value.matplotlib} />}
          {code.value.lstsq && (
            <>
              <CodeBlock label="Library routine" code={code.value.lstsq} />
              <p className="caption">
                Library routines avoid forming XᵀX for numerical reasons — the subject of Lesson 4.
              </p>
            </>
          )}
        </>
      ) : (
        <ViewNotice error={code.error} />
      )}
    </ModuleLayout>
  );
}
