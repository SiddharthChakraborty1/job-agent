import { useState } from 'react'

const KEYWORDS = new Set(
  'def return if elif else for while in not and or is None True False import from as class with lambda break continue pass yield try except finally raise global nonlocal'.split(' '),
)
const BUILTINS = new Set(
  'len range enumerate max min sum sorted set dict list tuple int str float abs zip map filter print any all reversed iter next'.split(' '),
)

type Tok = { t: string; c?: string }

function tokenize(line: string): Tok[] {
  const out: Tok[] = []
  const re = /(#.*$)|('(?:\\.|[^'])*'|"(?:\\.|[^"])*")|(\b\d+(?:\.\d+)?\b)|(@\w+)|([A-Za-z_]\w*)|(\s+)|(.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const [tok, com, str, num, deco, word] = m
    if (com) out.push({ t: tok, c: 'tk-com' })
    else if (str) out.push({ t: tok, c: 'tk-str' })
    else if (num) out.push({ t: tok, c: 'tk-num' })
    else if (deco) out.push({ t: tok, c: 'tk-deco' })
    else if (word) {
      if (KEYWORDS.has(word)) out.push({ t: tok, c: 'tk-kw' })
      else if (BUILTINS.has(word)) out.push({ t: tok, c: 'tk-fn' })
      else out.push({ t: tok })
    } else out.push({ t: tok })
  }
  return out
}

export function Code({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="code">
      <button className="code-copy" onClick={copy} aria-label="Copy template">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>
        <code>
          {code.split('\n').map((line, i) => (
            <span className="code-line" key={i}>
              {tokenize(line).map((tk, j) =>
                tk.c ? (
                  <span key={j} className={tk.c}>
                    {tk.t}
                  </span>
                ) : (
                  tk.t
                ),
              )}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
