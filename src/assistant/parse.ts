import { TenderStage, UserRole } from '../types';
import { AssistantData, DateField, Filters, GroupBy, Intent, Measure, Query, StatusClass, TenderFocus } from './types';

// Reads a typed question and turns it into a Query: which tenders (filters), and what to do with
// them (list, count, total, break down, rank, or one of the ready-made analyses). There is no AI
// here: the question is matched against the vocabulary below and against names found in the data.

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Words the parser relies on; a mistyped word is corrected to the nearest one of these
const KEYWORDS = `tender tenders status pending awarded cancelled closed pipeline delayed overdue stuck
bidding estimation negotiation evaluation cashflow floated approval received discussion finance
procurement officer officers holder holding group groups stage stages function department priority
critical urgent value estimate savings average total count summary overview analysis bottleneck
workload compare timeline history movement movements bidders holidays tasks highest lowest largest
oldest newest latest between above below month monthly yesterday today week year january february
march april june july august september october november december limited single proprietary
global technical leader members breakdown distribution active ongoing reason reasons`.split(/\s+/);

// Words that carry no meaning for a description search
const STOP_WORDS = new Set(
  `a an the of in on at to for from by with and or is are was were be been being do does did done has have had
i me my mine we our you your it its this that these those there here what which who whom whose when where
why how all any each every some many much more most less least than then so as if not no yes ok please pls
kindly show list give get tell find display view see want need can could would should will shall may might
let us about into over under between during per also only just now currently current status state tender
tenders file files case cases number numbers details detail info information data report reports record
records item items total overall across vs versus wise sr pr crfq stage stages days day working work time
taken take takes took long far up down out off still yet till until since ago new old same other another
both either neither one two three first last next previous name names officer officers people person
department function type types group groups value values amount worth cr crore crores lakh lakhs rs inr
count sum average avg mean top highest lowest largest smallest biggest oldest newest latest longest
pending active ongoing open closed awarded cancelled delayed overdue stuck late held holding holds hold
handled handling being going currently right wise based against regarding related relating respect
whats hows whos its im ive id know looking look search check checking update updates give gives due percentage
percent share ratio proportion thanks thank okay great nice bye hello doing done made make sorted order ordered
ranked rank compared than among amongst created raised list lists showing shown tell says said mean means meant`.split(/\s+/)
);

/** The question text; matched parts are blanked out so that nothing is interpreted twice. */
class Scanner {
  constructor(public text: string) {}

  has(re: RegExp): boolean {
    return re.test(this.text);
  }

  take(re: RegExp): RegExpExecArray | null {
    const m = re.exec(this.text);
    if (!m || m[0].length === 0) return null;
    this.text = this.text.slice(0, m.index) + ' '.repeat(m[0].length) + this.text.slice(m.index + m[0].length);
    return m;
  }

  takeAll(re: RegExp): RegExpExecArray[] {
    const all: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = this.take(re))) all.push(m);
    return all;
  }
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
    }
  }
  return row[b.length];
}

/** Corrects typing mistakes in longer words ('biding' -> 'bidding', 'negotation' -> 'negotiation'). */
function correctSpelling(text: string, vocabulary: Set<string>, dataWords: Set<string>): string {
  return text.replace(/[a-z]{5,}/g, (word) => {
    if (vocabulary.has(word) || STOP_WORDS.has(word)) return word;
    // A word that appears in the data (a description, a name) is not a mistake
    for (const known of dataWords) {
      if (known.startsWith(word) || (known.length >= 4 && word.startsWith(known))) return word;
    }
    const allowed = word.length >= 8 ? 2 : 1;
    let best = word;
    let bestDistance = allowed + 1;
    for (const candidate of vocabulary) {
      if (candidate[0] !== word[0] || Math.abs(candidate.length - word.length) > allowed) continue;
      const d = editDistance(word, candidate);
      if (d < bestDistance) {
        best = candidate;
        bestDistance = d;
      }
    }
    return best;
  });
}

const STAGE_ALIASES: [RegExp, TenderStage][] = [
  [/\b(under )?discussion( with( the)? users?)?\b/, 'Under Discussion with User'],
  [/\b(under )?bqc ?\/? ?tech(nical)?( eval(uation)?)?\b|\b(under |in |at )?tech(nical)? eval(uation)?( stage)?\b|\bevaluation stage\b|\b(under |in |at )?evaluation\b/, 'Under BQC / Tech Evaluation'],
  [/\bcash ?flow( report)?( preparation)?\b/, 'Cashflow report Preparation'],
  [/\b(under )?award approval\b|\bunder award\b/, 'Under Award Approval'],
  [/\b(under |in |at )?negotiations?\b/, 'Under Negotiation'],
  [/\b(under |in |at )?bidding\b/, 'Under Bidding'],
  [/\b(yet )?to be floated\b|\bnot (yet )?floated\b|\byet to float\b/, 'To be Floated'],
  [/\bbqc (approval|preparation)\b/, 'BQC approval'],
  [/\b(under |in |at )?estimation( stage)?\b/, 'Under Estimation'],
  [/\bpr received\b|\bpr stage\b/, 'PR Received'],
  [/\bbqc\b/, 'BQC approval'],
];

const ROLE_WORDS: [RegExp, UserRole][] = [
  [/\b(finance|fm|fms)\b/, 'FM'],
  [/\b(cec|estimation cell|estimation team|estimators?)\b/, 'CEC'],
  [/\b(procurement|pm|pms)\b/, 'PM'],
];

const DIMENSION = '(stage|status|officer|pm|holder|desk|group|type|function|department|role|team|pillar|month|priority)';
const DIMENSION_MAP: Record<string, GroupBy> = {
  stage: 'stage', status: 'status', officer: 'officer', pm: 'officer', holder: 'holder', desk: 'holder',
  group: 'group', type: 'type', function: 'function', department: 'function', role: 'role', team: 'role',
  pillar: 'role', month: 'month', priority: 'priority',
};

const HOLDER_CUE = '(?:with|held by|lying with|sitting with|pending with|pending at|desk of|inbox of|queue of|in the hands of)';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Finds a period in the question ('january 2025', 'last 30 days', 'this month', 'in 2024'). */
function takeDateRange(s: Scanner, now: Date): { from: number; to: number; label: string } | null {
  const today = startOfDay(now);
  const range = (from: Date, to: Date, label: string) => ({ from: from.getTime(), to: to.getTime(), label });
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  let m = s.take(/\b(?:last|past|previous)\s+(\d+)\s+(day|week|month)s?\b/);
  if (m) {
    const n = Number(m[1]);
    const from =
      m[2] === 'month'
        ? new Date(today.getFullYear(), today.getMonth() - n, today.getDate())
        : addDays(today, -(m[2] === 'week' ? n * 7 : n));
    return range(from, addDays(today, 1), `last ${n} ${m[2]}${n === 1 ? '' : 's'}`);
  }
  if (s.take(/\btoday\b/)) return range(today, addDays(today, 1), 'today');
  if (s.take(/\byesterday\b/)) return range(addDays(today, -1), today, 'yesterday');
  m = s.take(/\b(this|last|previous|next)\s+(week|month|year)\b/);
  if (m) {
    const shift = m[1] === 'this' ? 0 : m[1] === 'next' ? 1 : -1;
    if (m[2] === 'week') {
      const monday = addDays(today, -((today.getDay() + 6) % 7) + shift * 7);
      return range(monday, addDays(monday, 7), `${m[1]} week`);
    }
    if (m[2] === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth() + shift, 1);
      return range(first, new Date(first.getFullYear(), first.getMonth() + 1, 1), `${MONTH_LABELS[first.getMonth()]} ${first.getFullYear()}`);
    }
    const year = today.getFullYear() + shift;
    return range(new Date(year, 0, 1), new Date(year + 1, 0, 1), `${year}`);
  }

  // A month name, with or without a year. 'may' and 'march' are also ordinary words, so a short
  // month name needs a year or a preposition next to it.
  const monthRe = new RegExp(
    `\\b(in |during |for |of |since |from )?(${MONTHS.map((name) => `${name}|${name.slice(0, 3)}`).join('|')}|sept)[\\s,'-]*(\\d{4}|\\d{2})?\\b`
  );
  m = s.text.match(monthRe) as RegExpExecArray | null;
  if (m && (m[1] || m[3] || m[2].length > 3) && !(m[2] === 'may' && !m[1] && !m[3])) {
    s.take(monthRe);
    const month = MONTHS.findIndex((name) => name.startsWith(m![2].slice(0, 3)));
    const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : today.getFullYear();
    return range(new Date(year, month, 1), new Date(year, month + 1, 1), `${MONTH_LABELS[month]} ${year}`);
  }

  m = s.take(/\b(?:in |during |for |of |year )?(20\d{2})\b/);
  if (m) {
    const year = Number(m[1]);
    return range(new Date(year, 0, 1), new Date(year + 1, 0, 1), `${year}`);
  }
  return null;
}

export function parseQuestion(question: string, data: AssistantData, hasPrevious: boolean, now: Date = new Date()): Query {
  const officerNames = data.users.filter((u) => u.role !== 'ADMIN').map((u) => u.name);
  const typeNames = Array.from(
    new Set([...data.tenders.map((t) => t.tender_type), 'Open', 'Limited', 'Single', 'OEM', 'SOR', 'QCBS', 'Proprietary', 'Global / ICB'].filter(Boolean))
  ) as string[];
  const functionNames = Array.from(new Set(data.tenders.map((t) => t.user_function).filter(Boolean))) as string[];

  // Words found in the data: never "corrected", and usable for a description search
  const descriptionWords = new Set<string>();
  data.tenders.forEach((t) => (t.item_description || '').toLowerCase().match(/[a-z]{3,}/g)?.forEach((w) => descriptionWords.add(w)));
  const nameWords = new Set<string>();
  [...officerNames, ...typeNames, ...functionNames].forEach((name) => name.toLowerCase().match(/[a-z]{3,}/g)?.forEach((w) => nameWords.add(w)));

  const vocabulary = new Set([...KEYWORDS, ...MONTHS]);
  nameWords.forEach((w) => w.length >= 5 && vocabulary.add(w));

  let text = question
    .toLowerCase()
    .replace(/[“”"`?!]/g, ' ')
    .replace(/[’']s\b/g, ' ')
    .replace(/[’']/g, '')
    .replace(/\bcanceled\b/g, 'cancelled')
    .replace(/\bcancelation\b/g, 'cancellation')
    .replace(/\s+/g, ' ')
    .trim();
  text = ` ${correctSpelling(text, vocabulary, new Set([...descriptionWords, ...nameWords]))} `;

  const full = text; // for intent tests; `s` is consumed as parts are understood
  const s = new Scanner(text);
  const filters: Filters = {};
  const query: Query = { intent: 'unknown', filters, tenderRefs: [], refine: false, notUnderstood: [] };

  // ---- Tenders named in the question -------------------------------------------------------
  const refs = new Set<number>();
  for (const m of s.takeAll(/\b(pr|crfq)[\s\-#:]*(\d{5,})\b/)) {
    const found = data.tenders.filter((t) => ((m[1] === 'pr' ? t.pr_no : t.crfq_no) || '').toLowerCase().includes(m[2]));
    if (found.length > 0) found.forEach((t) => refs.add(t.sr_no));
    else query.missingRef = `${m[1].toUpperCase()}${m[2]}`;
  }
  for (const m of s.takeAll(/\b(?:tender|sr|serial|file|sl)\s*(?:no\.?|number|num)?\s*#?\s*(\d{1,4})\b|#\s*(\d{1,4})\b/)) {
    const srNo = Number(m[1] ?? m[2]);
    if (data.tenders.some((t) => t.sr_no === srNo)) refs.add(srNo);
    else query.missingRef = `tender ${srNo}`;
  }
  for (const m of s.takeAll(/\b(\d{8,})\b/)) {
    const found = data.tenders.filter((t) => t.pr_no.includes(m[1]) || (t.crfq_no || '').includes(m[1]));
    if (found.length > 0) found.forEach((t) => refs.add(t.sr_no));
    else query.missingRef = m[1];
  }
  query.tenderRefs = Array.from(refs);

  // ---- Ready-made analyses (tested on the whole question) -------------------------------------
  const isHelp = /^ (help|hi|hello|hey|menu|examples?|start) $/.test(full) || /what can (you|i) (do|ask|answer)|how (do i|to) use/.test(full);
  const wantsBottleneck =
    /\bbottle ?necks?\b|\bslowest stage|which stage (takes|is taking|took|is the slowest|is slow)|(time|days|duration) (taken )?(per|in each|in every|at each|at every|by|for each) stage|stage[- ]?wise (time|duration|days)|stage (time|duration)s?\b|where (do|are|does) (the )?(tenders?|files?) (get |getting )?(stuck|delayed)|takes? (the )?(most|longest|maximum) time|how long (does|do|did) .*(stage|take)/.test(full);
  const wantsRoleTime =
    /pm vs fm|(time|days) (by|per|with each) (role|team|pillar)|(role|team)[- ]?wise (time|days)|(time|days) (spent |taken )?(with|by|at) (finance|procurement|estimation cell|cec|pm|fm)\b|how (long|much time) (does|do|did|is) (finance|procurement|estimation cell|cec|pm|fm)\b/.test(full);
  const officerSpeed =
    /\b(slowest|fastest|quickest) (officer|pm|fm|person|holder)|\b(which|what) (officer|pm|fm|person|holder)\b.*\btak(es?|ing) (the )?(most|longest|least|maximum) time|\bwho\b.*\btak(es?|ing) (the )?(most|longest|least|maximum) time|\bhandling time\b|\bwho is (the )?(slowest|fastest|quickest)\b/.exec(full);
  const isThanks = /^ (thanks|thank you|thankyou|ok|okay|great|good|nice|fine|bye|got it)( .*)? $/.test(full) && full.trim().split(' ').length <= 3;
  const wantsWorkload =
    !!officerSpeed ||
    /\bwork ?load|\bbusiest|\boverloaded|most loaded|who (has|have|is holding|holds) (the )?(most|maximum|highest|max)|(officer|holder)[- ]?wise (pending|load|holding)|\bperformance\b|\bcapacity\b/.test(full);
  const wantsSummary =
    /\b(summary|summarise|summarize|overview|snapshot|dashboard|analysis|analyse|analyze|analytics|insights?|highlights|health)\b|how are we doing|\bbrief\b|\breport\b/.test(full);
  const wantsCompare = /\b(compare|comparison|versus|vs)\b/.test(full);
  const wantsEvaluation = /\b(emd|bidders?|sub[- ]?stages?|bqc evaluation)\b/.test(full);
  const wantsCancelReasons = /\bcancel/.test(full) && /\b(why|reasons?|cause)\b/.test(full);
  const wantsHolidays = /\bholidays?\b/.test(full);
  const wantsTasks = /\b(tasks?|to[- ]?dos?|reminders?)\b/.test(full);
  const wantsPeople =
    /\b(finance|entity|estimate|estimation) head\b|\bwho (is|are) (the )?.*\b(head|leader|leaders|members?)\b|\b(head|leader|members?|officers) (of|in) (the )?group\b|\bgroup \d+ (members?|leader|officers|team)\b/.test(full);

  // ---- Break-down dimension -------------------------------------------------------------------
  let m = s.take(new RegExp(`\\b(?:(?<!held |handled |created |raised )by|per|each|every|across|for each|for every)\\s+(?:the\\s+)?${DIMENSION}s?\\b`));
  if (!m) m = s.take(new RegExp(`\\b${DIMENSION}[\\s-]?wise\\b`));
  if (!m) m = s.take(new RegExp(`\\b(?:compare|comparison of|comparison between)\\s+(?:all\\s+)?(?:the\\s+)?${DIMENSION}s\\b`));
  if (!m) m = s.take(new RegExp(`\\b(?:which|what)\\s+${DIMENSION}s?\\b`));
  if (m) query.groupBy = DIMENSION_MAP[m[1]];
  if (s.take(/\bmonthly\b|\bmonth on month\b|\bmonth[- ]over[- ]month\b|\btrend\b/)) query.groupBy = 'month';
  if (s.take(/\b(distribution|breakdown|break[- ]?up|split)\b/) && !query.groupBy) query.groupBy = 'stage';

  // ---- Ranking --------------------------------------------------------------------------------
  const plural = /\btenders\b|\bfiles\b|\bcases\b/.test(full);
  m = s.take(/\btop\s*(\d+)?\b/);
  if (m) query.limit = m[1] ? Number(m[1]) : 5;
  m = s.take(/\b(\d+)\s+(?=highest|largest|biggest|oldest|longest|latest|newest|lowest|smallest|most)/);
  if (m) query.limit = Number(m[1]);
  if (s.take(/\b(longest (pending|waiting|stuck)|most delayed|stuck (the )?longest|pending (the )?longest)\b/)) {
    query.sort = { by: 'ageing', dir: 'desc' };
  } else if (s.take(/\b(oldest|slowest)\b/)) {
    query.sort = { by: 'sla', dir: 'desc' };
  } else if (s.take(/\b(fastest|quickest)\b/)) {
    query.sort = { by: 'sla', dir: 'asc' };
  } else if (s.take(/\b(newest|latest|most recent|recent)\b/)) {
    query.sort = { by: 'date', dir: 'desc' };
  } else if (s.take(/\b(highest|largest|biggest|maximum|max|costliest|most valuable|most expensive)\b/)) {
    query.sort = { by: 'value', dir: 'desc' };
  } else if (s.take(/\b(lowest|smallest|minimum|cheapest|least)\b/)) {
    query.sort = { by: 'value', dir: 'asc' };
  }
  const wantsSorted = !!s.take(/\b(sorted|sort|ordered|order|ranked|rank|arranged) (by|on)\b/);
  const ascending = !!s.take(/\b(ascending|lowest first|smallest first|low to high)\b/);
  s.take(/\b(descending|highest first|largest first|high to low)\b/);
  if (wantsSorted && !query.sort) query.sort = { by: 'value', dir: ascending ? 'asc' : 'desc' };
  if (wantsSorted && query.limit === undefined) query.limit = 10000;
  if (query.sort && query.limit === undefined) query.limit = plural ? 5 : 1;
  const sortIsDefault = wantsSorted || (query.limit !== undefined && !query.sort);
  if (sortIsDefault && !query.sort) query.sort = { by: 'value', dir: 'desc' };

  // ---- Amounts and day counts --------------------------------------------------------------------
  const mentionsSla = /\bsla\b|\bturnaround\b|\btat\b|\bcycle time\b/.test(full);
  const applyNumber = (value: number, unit: string | undefined, bound: 'min' | 'max') => {
    const isDays = unit ? /^d/.test(unit) : /\bdays?\b/.test(full) && !/\b(cr|crores?|lakhs?|value|worth|estimate)\b/.test(full);
    if (isDays) {
      if (mentionsSla) filters[bound === 'min' ? 'slaMin' : 'slaMax'] = value;
      else filters[bound === 'min' ? 'ageMin' : 'ageMax'] = value;
    } else {
      const inCr = unit && /^l/.test(unit) ? value / 100 : value;
      filters[bound === 'min' ? 'valueMin' : 'valueMax'] = inCr;
    }
  };
  const UNIT = '(cr|crores?|lakhs?|lacs?|days?|d)?';
  const AMOUNT = '(?:rs\\.?\\s*|inr\\s*|₹\\s*)?(\\d+(?:\\.\\d+)?)';
  m = s.take(new RegExp(`\\bbetween\\s+${AMOUNT}\\s*${UNIT}\\s*(?:and|to|-)\\s*${AMOUNT}\\s*${UNIT}\\b`));
  if (m) {
    applyNumber(Number(m[1]), m[4] || m[2], 'min');
    applyNumber(Number(m[3]), m[4] || m[2], 'max');
  }
  for (const n of s.takeAll(new RegExp(`(?:\\b(?:above|over|more than|greater than|exceeding|exceeds?|at least|minimum|older than|longer than|beyond|for more than|for over)|>=?)\\s*${AMOUNT}\\s*${UNIT}\\b`))) {
    applyNumber(Number(n[1]), n[2], 'min');
  }
  for (const n of s.takeAll(new RegExp(`(?:\\b(?:below|less than|under|within|at most|maximum|up ?to|lower than|smaller than|newer than|not more than)|<=?)\\s*${AMOUNT}\\s*${UNIT}\\b`))) {
    applyNumber(Number(n[1]), n[2], 'max');
  }

  // ---- Period ---------------------------------------------------------------------------------
  const period = takeDateRange(s, now);

  // ---- Teams (finance / procurement / estimation) -------------------------------------------------
  for (const [re, role] of ROLE_WORDS) {
    const withCue = new RegExp(`\\b${HOLDER_CUE}\\s+(?:the\\s+)?${re.source.replace(/\\b/g, '')}(?: team| department| officers?)?\\b`);
    const holdsCue = new RegExp(`${re.source}\\s+(?:is |are )?(?:holding|holds|has|have)\\b`);
    if (s.take(withCue) || s.take(holdsCue)) {
      filters.holderRole = role;
      query.role = role;
    }
  }
  if (!query.role && s.take(/\b(with|at) estimation\b/)) {
    filters.holderRole = 'CEC';
    query.role = 'CEC';
  }

  if (s.take(/\b(without|no|missing|awaiting|pending) (an? |the )?estimates?( value)?\b|\bestimates? (is |are )?(pending|missing|awaited|not (yet )?(entered|added|received))\b/)) {
    filters.noEstimate = true;
  }

  // ---- Evaluation words are a topic, not a stage -------------------------------------------------
  if (wantsEvaluation) s.takeAll(/\b(emd|bqc)( evaluation)?\b|\bbidders?\b|\bsub[- ]?stages?\b/);

  // ---- Stages ---------------------------------------------------------------------------------
  const stages: TenderStage[] = [];
  for (const [re, stage] of STAGE_ALIASES) {
    if (s.take(re)) stages.push(stage);
  }
  if (stages.length > 0) filters.stages = stages;

  // ---- Status ---------------------------------------------------------------------------------
  let status: StatusClass | undefined;
  if (s.take(/\bpost[- ]?award\b|\bnot (yet )?closed\b|\bpending closure\b|\bto be closed\b/)) status = 'postAward';
  else if (s.take(/\bawarded value\b|\baward value\b|\bcontract value\b/)) query.measure = 'awarded';
  if (!status && s.take(/\bcancell?(ed|ation|ations)?\b/)) status = 'cancelled';
  if (!status && s.take(/\b(awarded|awards?)\b/)) status = 'awarded';
  if (!status && s.take(/\b(closed|completed)\b/)) status = 'closed';
  if (!status && s.take(/\b(in (the )?pipeline|pipeline|in[- ]progress|ongoing|active|running|live|pending|not awarded|under process|in process)\b/)) status = 'pipeline';
  if (status) filters.status = status;

  // ---- Officers -------------------------------------------------------------------------------
  const holders: string[] = [];
  const officers: string[] = [];
  const addOfficer = (name: string, asHolder: boolean) => {
    const list = asHolder ? holders : officers;
    if (!list.includes(name)) list.push(name);
  };
  const isHolderMention = (pattern: string) =>
    new RegExp(`\\b${HOLDER_CUE}\\s+(?:the\\s+)?(?:mr\\.?\\s+|ms\\.?\\s+)?${pattern}`).test(s.text) ||
    new RegExp(`${pattern}\\s+(?:is |are )?(?:holding|holds|has|have)\\b|${pattern}\\s+(?:desk|inbox|queue)\\b`).test(s.text);

  for (const name of [...officerNames].sort((a, b) => b.length - a.length)) {
    const pattern = escapeRegex(name.toLowerCase()).replace(/\s+/g, '\\s+');
    if (new RegExp(`\\b${pattern}\\b`).test(s.text)) {
      addOfficer(name, isHolderMention(pattern));
      s.take(new RegExp(`\\b${pattern}\\b`));
    }
  }
  // A single distinctive word of a name ('rajesh', 'meera')
  const nameCandidates = Array.from(new Set<string>(s.text.match(/[a-z]{4,}/g) || [])).filter(
    (word) => !STOP_WORDS.has(word) && !KEYWORDS.includes(word)
  );
  const officersWith = (word: string) => officerNames.filter((name) => name.toLowerCase().split(/\s+/).includes(word));
  for (const word of nameCandidates) {
    const matching = officersWith(word);
    if (matching.length === 1) {
      addOfficer(matching[0], isHolderMention(word));
      s.take(new RegExp(`\\b${word}\\b`));
    }
  }
  for (const word of nameCandidates) {
    const matching = officersWith(word);
    if (matching.length < 2) continue;
    s.take(new RegExp(`\\b${word}\\b`));
    const alreadyNamed = [...holders, ...officers].some((name) => matching.includes(name));
    if (!alreadyNamed && !descriptionWords.has(word)) query.ambiguous = { word, options: matching.slice(0, 8) };
  }
  // The person asking
  if (s.take(/\b(my (queue|inbox|desk|pending|action)s?|pending with me|with me|held by me|i am holding|i hold|on my desk)\b/)) {
    addOfficer(data.currentUser.name, true);
  } else if (!/\bmy group\b/.test(s.text) && s.take(/\b(my|mine|assigned to me|created by me|i am working|i work|do i have|i have)\b/)) {
    addOfficer(data.currentUser.name, false);
  }
  if (holders.length > 0) filters.holders = holders;
  if (officers.length > 0) filters.officers = officers;

  // A team named without "with": 'finance tenders' means the files finance holds
  if (!query.role) {
    for (const [re, role] of ROLE_WORDS) {
      if (s.take(re)) {
        query.role = role;
        break;
      }
    }
  }

  // ---- Groups, functions, types, priority ---------------------------------------------------------
  const groups = s.takeAll(/\bgroup[\s-]?(\d+)\b/).map((g) => `Group ${g[1]}`);
  if (s.take(/\bmy group\b/) && data.currentUser.group) groups.push(data.currentUser.group);
  if (groups.length > 0) filters.groups = Array.from(new Set(groups));

  const functions: string[] = [];
  const saysFunction = /\b(function|department|user function)\b/.test(full);
  for (const name of [...functionNames].sort((a, b) => b.length - a.length)) {
    const lower = name.toLowerCase();
    if (lower.length <= 3) {
      // Short codes (RE, SOR) only count when typed in capitals or next to the word "function"
      const typedInCapitals = new RegExp(`\\b${escapeRegex(name.toUpperCase())}\\b`).test(question);
      const alsoAType = typeNames.some((t) => t.toLowerCase() === lower);
      if ((saysFunction || (typedInCapitals && !alsoAType)) && s.take(new RegExp(`\\b${escapeRegex(lower)}\\b`))) functions.push(name);
      continue;
    }
    const pattern = escapeRegex(lower).replace(/&/g, '\\s*(?:&|and)?\\s*').replace(/[-\s]+/g, '[-\\s]*');
    if (s.take(new RegExp(`\\b${pattern}\\b`))) functions.push(name);
  }
  if (functions.length > 0) filters.functions = functions;

  const types: string[] = [];
  for (const name of typeNames) {
    const words = name.toLowerCase().split(/[\s/]+/).filter((w) => w.length >= 3);
    if (words.some((w) => s.take(new RegExp(`\\b${escapeRegex(w)}(?: tenders?| type| mode)?\\b`)))) types.push(name);
  }
  if (types.length > 0) filters.types = types;

  if (s.take(/\b(critical|very urgent)\b/)) filters.priorities = ['Critical'];
  else if (s.take(/\burgent\b/)) filters.priorities = ['High', 'Critical'];
  else if (s.take(/\bhigh[- ]priority\b|\bpriority high\b/)) filters.priorities = ['High', 'Critical'];
  else if (s.take(/\bmedium[- ]priority\b/)) filters.priorities = ['Medium'];
  else if (s.take(/\b(normal|low)[- ]priority\b/)) filters.priorities = ['Normal'];

  if (
    !wantsBottleneck &&
    s.take(/\b(delayed|delays?|overdue|late|stuck|breach(ed|ing|es)?|behind schedule|beyond (the )?(sla|target)|over (the )?(sla|target)|exceed(ed|ing|s)? (the )?(sla|target)|long pending|ageing|aging|slow)\b/)
  ) {
    filters.delayed = true;
  }

  // ---- What to do with the tenders -----------------------------------------------------------------
  const wantsCount = !!s.take(/\b(how many|count|number of|no\.? of|total number( of)?|percentage|percent|share|proportion)\b|%/);
  const wantsAverage = !!s.take(/\b(average|avg|mean)\b/);
  if (s.take(/\b(savings?|saved)\b/)) query.measure = 'savings';
  else if (s.take(/\bsla\b|\bturnaround( time)?\b|\btat\b|\bcycle time\b/)) query.measure = 'sla';
  else if (s.take(/\b(days in stage|pending days|waiting( time)?|how long)\b/)) query.measure = 'ageing';
  else if (!query.measure && s.take(/\b(value|worth|amount|cost|estimates?|estimated)\b/)) query.measure = 'value';
  const wantsTotal = !!s.take(/\b(total|sum|overall|aggregate|combined)\b/) && !!query.measure;
  if (sortIsDefault && query.sort) {
    if (query.measure && query.measure !== 'count') query.sort.by = query.measure;
    else if (filters.delayed) query.sort.by = 'ageing';
  }

  // ---- What the question wants to know about a named tender ---------------------------------------
  let focus: TenderFocus | undefined;
  if (/\b(timeline|history|movements?|audit|trail|journey|track|tracking|log)\b/.test(full)) focus = 'timeline';
  else if (wantsEvaluation) focus = 'bidders';
  else if (wantsCancelReasons) focus = 'cancel';
  else if (/\b(delayed|delay|overdue|late|stuck|on time|on track|within (sla|target))\b/.test(full)) focus = 'delay';
  else if (/\b(when|dates?|floated|due|opened|opening)\b/.test(full)) focus = 'dates';
  else if (/\b(sla|how long|how many days|days|duration|time taken)\b/.test(full)) focus = 'time';
  else if (/\b(value|estimate|savings?|cost|worth|amount)\b/.test(full)) focus = 'value';
  else if (/\b(who|whom|where|holder|holding|with)\b/.test(full)) focus = 'holder';
  query.tenderFocus = focus;
  if (focus === 'dates') {
    if (/\bfloat/.test(full)) query.tenderDate = 'floated';
    else if (/\b(due|opening|opened|closing)\b/.test(full)) query.tenderDate = 'due';
    else if (/\baward/.test(full)) query.tenderDate = 'awarded';
    else if (/\bcancel/.test(full)) query.tenderDate = 'cancelled';
    else if (/\b(received|created|raised|initiated|started)\b/.test(full)) query.tenderDate = 'received';
  }
  if (officerSpeed) query.officerSpeed = /fastest|quickest|least/.test(officerSpeed[0]) ? 'fastest' : 'slowest';

  // ---- Which date the period refers to ---------------------------------------------------------------
  if (period) {
    let field: DateField = 'received';
    if (/\bfloated\b|\bfloating\b/.test(full)) field = 'floated';
    else if (/\b(due|opening|opened|closing)\b/.test(full)) field = 'due';
    else if (status === 'awarded' || status === 'closed' || status === 'postAward') field = 'awarded';
    else if (status === 'cancelled') field = 'cancelled';
    filters.date = { field, ...period };
  }

  // ---- Words left over: look for them in the descriptions ------------------------------------------
  s.takeAll(/\b(timeline|history|movements?|audit|trail|journey|track|tracking|log|summary|summarise|summarize|overview|snapshot|dashboard|analysis|analyse|analyze|analytics|insights?|highlights|health|compare|comparison|bottle ?necks?|work ?load|busiest|performance|holidays?|tasks?|reasons?|head|leaders?|members?|entity)\b/);
  const leftovers = (s.text.match(/[a-z][a-z0-9&-]{2,}/g) || []).filter((w) => !STOP_WORDS.has(w) && !KEYWORDS.includes(w));
  const searchable = leftovers.filter((w) => descriptionWords.has(w) || (w.endsWith('s') && descriptionWords.has(w.slice(0, -1))));
  if (searchable.length > 0 && query.tenderRefs.length === 0) filters.words = searchable;
  query.notUnderstood = leftovers.filter((w) => !searchable.includes(w));

  // ---- Comparison -------------------------------------------------------------------------------
  if (wantsCompare) {
    if ((filters.groups?.length || 0) >= 2) query.compare = { kind: 'group', values: filters.groups! };
    else if (officers.length + holders.length >= 2) query.compare = { kind: 'officer', values: [...officers, ...holders] };
    else if (stages.length >= 2) query.compare = { kind: 'stage', values: stages };
    else if (types.length >= 2) query.compare = { kind: 'type', values: types };
    if (query.compare) {
      if (query.compare.kind === 'group') delete filters.groups;
      if (query.compare.kind === 'officer') {
        delete filters.officers;
        delete filters.holders;
      }
      if (query.compare.kind === 'stage') delete filters.stages;
      if (query.compare.kind === 'type') delete filters.types;
    }
  }

  // ---- Decide the kind of answer ------------------------------------------------------------------
  const namesOfficer = officers.length + holders.length > 0;
  const hasFilters = Object.keys(filters).length > 0;
  let intent: Intent = 'unknown';
  if (isHelp) intent = 'help';
  else if (isThanks) intent = 'thanks';
  else if (query.tenderRefs.length > 0 || query.missingRef) intent = 'tender';
  else if (query.compare) intent = 'compare';
  else if (wantsCompare && (filters.groups || query.groupBy)) intent = 'breakdown';
  else if (wantsPeople) intent = 'people';
  else if (wantsHolidays) intent = 'holidays';
  else if (wantsTasks) intent = 'tasks';
  else if (wantsCancelReasons) intent = 'cancelReasons';
  else if (wantsRoleTime || (wantsCompare && ROLE_WORDS.filter(([re]) => re.test(full)).length >= 2)) intent = 'roleTime';
  else if (officerSpeed) intent = 'workload';
  else if (wantsBottleneck) intent = namesOfficer ? 'workload' : 'bottleneck';
  else if (wantsWorkload) intent = 'workload';
  else if (wantsEvaluation) intent = 'evaluation';
  else if (wantsSummary || /^ (the )?(overall |current |latest )?(status|position|update)( report)? $/.test(full)) intent = namesOfficer ? 'workload' : 'summary';
  else if (status === 'postAward') intent = 'postAward';
  else if (query.groupBy) intent = 'breakdown';
  else if (query.sort) intent = 'top';
  else if (wantsCount) intent = 'count';
  else if (wantsAverage) intent = 'average';
  else if (wantsTotal || (query.measure && !hasFilters)) intent = 'total';
  else if (query.measure && /\b(value|worth|amount|estimate|cost) (of|for|in|with)\b/.test(full)) intent = 'total';
  else if (query.measure === 'savings') intent = 'total';
  else if (hasFilters || /\b(tenders?|files|cases|all|list|everything|register)\b/.test(full)) intent = 'list';
  query.intent = intent;

  if (intent === 'roleTime' && wantsCompare) query.role = undefined;

  // A team named in a list question means the files that team holds now
  if (query.role && !filters.holderRole && ['list', 'count', 'total', 'average', 'breakdown', 'top'].includes(intent)) {
    filters.holderRole = query.role;
  }
  // A lone officer name asks for that officer's work
  if (intent === 'list' && namesOfficer && Object.keys(filters).every((k) => k === 'officers' || k === 'holders') && !/\b(tenders?|files|cases|list)\b/.test(full)) {
    query.intent = 'workload';
  }
  if (wantsAverage && !query.measure) query.measure = 'sla';

  // ---- Does it build on the previous answer? -------------------------------------------------------
  if (hasPrevious && query.tenderRefs.length === 0 && intent !== 'help' && intent !== 'thanks') {
    const cue = /^ (and|also|only|now|then|but|what about|how about|of these|among|from these|out of these|in these|which of)\b/.test(full) || /\b(these|those|them|the same|above)\b/.test(full);
    const onlyAnOperation = !hasFilters && ['count', 'total', 'average', 'breakdown', 'top'].includes(intent);
    query.refine = cue || onlyAnOperation;
    if (query.refine && intent === 'unknown' && hasFilters) query.intent = 'list';
  }

  return query;
}
