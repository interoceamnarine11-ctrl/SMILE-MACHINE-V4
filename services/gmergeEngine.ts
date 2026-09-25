/**
 * G-Merge / Gammadyne Mailer Comprehensive Template Engine
 * 
 * Implements the full G-Merge specification:
 * - Double bracket statements: [[ ... ]]
 * - Triple bracket escaping: [[[ -> [[
 * - Data Types: Number, Boolean, String ("..." with "" escaping), Date (#...#)
 * - Declarations: [[var foo = 5, bar = "abc"]]
 * - Predefined Variables: -FirstName-, -LastName-, -FullName-, -Company-, -Domain-,
 *   -Email-, -Index-, -MessageID-, -Now-, -OperationType-, -Recipient-, -TID-, -User-, CR
 * - Assignments: [[let is_delinquent = TRUE]], [[let foo = bar]], [[let cost += 10]]
 * - Variable Defaults: [[-FirstName-:Customer]]
 * - Date Formatting: [[-Now-:MM D, yy]], [[BirthDate:h:ii:ss AP]], ~, @, ~@
 * - Data Switching: [[Color|1|red|2|blue|3|green|black]]
 * - Math & Operators: +, -, *, /, %, ^, =, !=, <, <=, >, >=, and, or, !
 * - Operator Precedence & Parentheses: [[(2 + 3) * 4]]
 * - Compound Statements: [[12; 34]], [[var s="foo"; s]]
 * - Comments: //, /* ... * / (nested), rem ...
 * - Conditional Bodies: [[if ...]] ... [[elseif ...]] ... [[else]] ... [[endif]]
 * - Built-in & User-Defined Functions: convert_lower_case, extract_first_name, date_format, etc.
 * - Statements in HTML & "raw" Directive: [[raw ...]]
 * - Backwards-compatible support for legacy {{var}} and {{var | 'fallback'}}
 */

export interface GMergeContext {
  recipient?: {
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    company?: string;
    phone?: string;
    country?: string;
    domain?: string;
    targetLanguage?: string;
    senderName?: string;
    senderOrganization?: string;
    senderEmail?: string;
    unsubscribeUrl?: string;
    customFields?: Record<string, any>;
    [key: string]: any;
  };
  index?: number;
  now?: Date;
  operationType?: number;
  tableId?: number | string;
  messageId?: string;
  userVariables?: Record<string, any>;
  userFunctions?: Record<string, (...args: any[]) => any>;
}

export type GMergeValue = string | number | boolean | Date | null | undefined;

// Ordinal words for DD (Day ordinal text)
const ORDINAL_WORDS = [
  'zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth',
  'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth',
  'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth',
  'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth', 'thirtieth', 'thirty-first'
];

// Number words for Y and YY (Years)
const NUMBER_WORDS_1_99: Record<number, string> = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
  10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen',
  17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
  60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety'
};

function numberToWordsUnder100(n: number): string {
  if (n in NUMBER_WORDS_1_99) return NUMBER_WORDS_1_99[n];
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  return `${NUMBER_WORDS_1_99[tens] || ''} ${NUMBER_WORDS_1_99[ones] || ''}`.trim();
}

function yearToWords(year: number, twoDigit: boolean): string {
  if (twoDigit) {
    const y = year % 100;
    return numberToWordsUnder100(y);
  }
  const century = Math.floor(year / 100);
  const rest = year % 100;
  const centuryStr = numberToWordsUnder100(century);
  if (rest === 0) {
    return `${centuryStr} hundred`;
  }
  return `${centuryStr} ${numberToWordsUnder100(rest)}`;
}

/**
 * Format Date using G-Merge formatting rules:
 * y, yy, Y, YY, m, mm, M, MM, d, dd, D, DD, w, W, WW, h, hh, H, HH, i, ii, s, ss, ap, AP, b, ~, @, ~@
 */
export function formatGMergeDate(date: Date, formatStr: string = 'm/d/yy'): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';

  const trimmed = formatStr.trim();
  if (trimmed === '~') {
    return date.toLocaleDateString();
  }
  if (trimmed === '@') {
    return date.toLocaleTimeString();
  }
  if (trimmed === '~@') {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  const monthsAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay(); // 0 is Sun
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const isPm = hours24 >= 12;

  // Day ordinal (5th, 1st, 2nd, 3rd)
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Timezone bias e.g. -0500
  const tzOffset = -date.getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
  const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
  const tzBias = `${tzSign}${tzHours}${tzMins}`;

  // Match token patterns sorted by descending length
  const tokensRegex = /(YY|WW|MM|DD|yy|mm|dd|hh|HH|ii|ss|AP|ap|D|W|M|Y|y|m|d|w|h|H|i|s|b)/g;

  return formatStr.replace(tokensRegex, (match) => {
    switch (match) {
      case 'yy': return String(year);
      case 'y': return String(year % 100).padStart(2, '0');
      case 'YY': return yearToWords(year, false);
      case 'Y': return yearToWords(year, true);
      case 'MM': return monthsFull[month - 1];
      case 'M': return monthsAbbr[month - 1];
      case 'mm': return String(month).padStart(2, '0');
      case 'm': return String(month);
      case 'DD': return ORDINAL_WORDS[day] || getOrdinal(day);
      case 'D': return getOrdinal(day);
      case 'dd': return String(day).padStart(2, '0');
      case 'd': return String(day);
      case 'WW': return daysFull[dayOfWeek];
      case 'W': return daysAbbr[dayOfWeek];
      case 'w': return String(dayOfWeek === 0 ? 7 : dayOfWeek);
      case 'HH': return String(hours24).padStart(2, '0');
      case 'H': return String(hours24);
      case 'hh': return String(hours12).padStart(2, '0');
      case 'h': return String(hours12);
      case 'ii': return String(minutes).padStart(2, '0');
      case 'i': return String(minutes);
      case 'ss': return String(seconds).padStart(2, '0');
      case 's': return String(seconds);
      case 'AP': return isPm ? 'p.m.' : 'a.m.';
      case 'ap': return isPm ? 'p' : 'a';
      case 'b': return tzBias;
      default: return match;
    }
  });
}

/**
 * Parses a date literal like #10/15/1999#, #10/15/99 14:06#, #Oct 15 1999 04:16:17 pm#, #5/Dec/96#
 */
export function parseGMergeDateLiteral(raw: string): Date | null {
  const cleaned = raw.replace(/^#|#$/g, '').trim();
  if (!cleaned) return null;

  // Try standard Date parsing
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // American format MM/DD/YYYY or MM/DD/YY
  const mdy = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|a\.m\.|p\.m\.)?)?$/i);
  if (mdy) {
    let year = parseInt(mdy[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const month = parseInt(mdy[1], 10) - 1;
    const day = parseInt(mdy[2], 10);
    let hours = mdy[4] ? parseInt(mdy[4], 10) : 0;
    const minutes = mdy[5] ? parseInt(mdy[5], 10) : 0;
    const seconds = mdy[6] ? parseInt(mdy[6], 10) : 0;
    const ap = mdy[7] ? mdy[7].toLowerCase().replace(/\./g, '') : null;
    if (ap === 'pm' && hours < 12) hours += 12;
    if (ap === 'am' && hours === 12) hours = 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }

  return null;
}

/**
 * Remove comments from G-Merge block:
 * - // ... to end of line
 * - / * ... * / with nested comment support!
 * - rem ... to end of statement
 */
export function stripGMergeComments(stmt: string): string {
  let result = '';
  let i = 0;
  const len = stmt.length;

  while (i < len) {
    // Check if inside a string literal
    if (stmt[i] === '"') {
      let str = '"';
      i++;
      while (i < len) {
        if (stmt[i] === '"') {
          if (i + 1 < len && stmt[i + 1] === '"') {
            str += '""';
            i += 2;
          } else {
            str += '"';
            i++;
            break;
          }
        } else {
          str += stmt[i];
          i++;
        }
      }
      result += str;
      continue;
    }

    // Single line comment: //
    if (stmt[i] === '/' && i + 1 < len && stmt[i + 1] === '/') {
      while (i < len && stmt[i] !== '\n' && stmt[i] !== '\r') {
        i++;
      }
      continue;
    }

    // Multi-line comment: /* ... */ with nesting support
    if (stmt[i] === '/' && i + 1 < len && stmt[i + 1] === '*') {
      i += 2;
      let depth = 1;
      while (i < len && depth > 0) {
        if (stmt[i] === '/' && i + 1 < len && stmt[i + 1] === '*') {
          depth++;
          i += 2;
        } else if (stmt[i] === '*' && i + 1 < len && stmt[i + 1] === '/') {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      continue;
    }

    // REM comment: rem <text> until end of statement or semicolon
    if ((stmt[i] === 'r' || stmt[i] === 'R') &&
        (stmt[i+1] === 'e' || stmt[i+1] === 'E') &&
        (stmt[i+2] === 'm' || stmt[i+2] === 'M') &&
        (i === 0 || /[\s;]/.test(stmt[i - 1])) &&
        (i + 3 >= len || /[\s]/.test(stmt[i + 3]))) {
      i += 3;
      while (i < len && stmt[i] !== ';') {
        i++;
      }
      continue;
    }

    result += stmt[i];
    i++;
  }

  return result;
}

/**
 * G-Merge Runtime Execution Environment
 */
export class GMergeEnvironment {
  public vars: Map<string, GMergeValue> = new Map();
  public userFunctions: Map<string, (...args: any[]) => any> = new Map();
  public context: GMergeContext;

  constructor(context: GMergeContext = {}) {
    this.context = context;
    this.initPredefinedVariables();
    this.initBuiltinFunctions();

    if (context.userVariables) {
      for (const [k, v] of Object.entries(context.userVariables)) {
        this.vars.set(k.toLowerCase(), v);
      }
    }
    if (context.userFunctions) {
      for (const [k, fn] of Object.entries(context.userFunctions)) {
        this.userFunctions.set(k.toLowerCase(), fn);
      }
    }
  }

  private initPredefinedVariables() {
    const r = this.context.recipient || {};
    const email = r.email || '';
    const domain = r.domain || (email.includes('@') ? email.split('@')[1] : '');
    const user = email.includes('@') ? email.split('@')[0] : '';
    
    const firstName = r.firstName || (r.name ? r.name.split(' ')[0] : '');
    const lastName = r.lastName || (r.name && r.name.includes(' ') ? r.name.split(' ').slice(1).join(' ') : '');
    const fullName = r.fullName || r.name || (firstName ? `${firstName} ${lastName}`.trim() : '');
    const company = r.company || (domain ? domain.split('.')[0].replace(/\b\w/g, l => l.toUpperCase()) : '');
    const recipientFormatted = fullName 
      ? `"${fullName}" ${email}${company ? ` (${company})` : ''}` 
      : email;

    const now = this.context.now || new Date();
    const index = this.context.index ?? 1;
    const opType = this.context.operationType ?? 1;
    const tid = this.context.tableId ?? index;
    const msgId = this.context.messageId || `${now.getTime()}.${Math.random().toString(36).substring(2, 10)}@${domain || 'mail.local'}`;

    // Predefined variables begin and end with a dash
    this.vars.set('-company-', company);
    this.vars.set('-domain-', domain);
    this.vars.set('-email-', email);
    this.vars.set('-firstname-', firstName);
    this.vars.set('-fullname-', fullName);
    this.vars.set('-lastname-', lastName);
    this.vars.set('-index-', index);
    this.vars.set('-messageid-', msgId);
    this.vars.set('-now-', now);
    this.vars.set('-operationtype-', opType);
    this.vars.set('-recipient-', recipientFormatted);
    this.vars.set('-tid-', tid);
    this.vars.set('-user-', user);
    this.vars.set('cr', '\r\n');

    // Also register standard column names directly
    this.vars.set('email', email);
    this.vars.set('firstname', firstName);
    this.vars.set('first_name', firstName);
    this.vars.set('customername', fullName);
    this.vars.set('name', fullName);
    this.vars.set('lastname', lastName);
    this.vars.set('last_name', lastName);
    this.vars.set('fullname', fullName);
    this.vars.set('full_name', fullName);
    this.vars.set('company', company);
    this.vars.set('companyname', company);
    this.vars.set('city', r.city || r.customFields?.city || r.customFields?.City || '');
    this.vars.set('country', r.country || '');
    this.vars.set('phone', r.phone || '');
    this.vars.set('domain', domain);
    this.vars.set('unsubscribeurl', r.unsubscribeUrl || '#');
    this.vars.set('unsubscribe_url', r.unsubscribeUrl || '#');
    this.vars.set('sendername', r.senderName || '');
    this.vars.set('sender_name', r.senderName || '');
    this.vars.set('senderorganization', r.senderOrganization || '');
    this.vars.set('sender_organization', r.senderOrganization || '');
    this.vars.set('senderfrom', r.senderEmail || '');
    this.vars.set('sender_from', r.senderEmail || '');

    // Merge any custom fields passed in recipient
    if (r.customFields) {
      for (const [k, v] of Object.entries(r.customFields)) {
        this.vars.set(k.toLowerCase(), v);
      }
    }
    // Also merge all top-level keys
    for (const [k, v] of Object.entries(r)) {
      if (!this.vars.has(k.toLowerCase()) && typeof v !== 'function') {
        this.vars.set(k.toLowerCase(), v);
      }
    }
  }

  private initBuiltinFunctions() {
    this.userFunctions.set('convert_lower_case', (s: any) => String(s ?? '').toLowerCase());
    this.userFunctions.set('lower', (s: any) => String(s ?? '').toLowerCase());
    this.userFunctions.set('convert_upper_case', (s: any) => String(s ?? '').toUpperCase());
    this.userFunctions.set('upper', (s: any) => String(s ?? '').toUpperCase());

    this.userFunctions.set('extract_first_name', (fullName: any) => {
      const s = String(fullName ?? '').trim();
      return s.split(' ')[0] || '';
    });

    this.userFunctions.set('extract_last_name', (fullName: any) => {
      const s = String(fullName ?? '').trim();
      const parts = s.split(' ');
      return parts.length > 1 ? parts.slice(1).join(' ') : '';
    });

    this.userFunctions.set('date_format', (dateVal: any, fmt: any) => {
      let d: Date | null = null;
      if (dateVal instanceof Date) d = dateVal;
      else if (typeof dateVal === 'string') d = parseGMergeDateLiteral(dateVal) || new Date(dateVal);
      if (!d || isNaN(d.getTime())) return '';
      return formatGMergeDate(d, String(fmt ?? 'm/d/yy'));
    });

    this.userFunctions.set('field_exists', (fieldName: any) => {
      const key = String(fieldName ?? '').toLowerCase().replace(/[{}]/g, '').trim();
      return this.vars.has(key) && this.vars.get(key) !== undefined;
    });

    this.userFunctions.set('length', (s: any) => String(s ?? '').length);
    this.userFunctions.set('trim', (s: any) => String(s ?? '').trim());
    this.userFunctions.set('round', (n: any, dec: any = 0) => {
      const num = Number(n);
      const d = Number(dec) || 0;
      return Number(num.toFixed(d));
    });
    this.userFunctions.set('abs', (n: any) => Math.abs(Number(n) || 0));
    this.userFunctions.set('min', (a: any, b: any) => Math.min(Number(a) || 0, Number(b) || 0));
    this.userFunctions.set('max', (a: any, b: any) => Math.max(Number(a) || 0, Number(b) || 0));
    this.userFunctions.set('if_empty', (val: any, fallback: any) => {
      if (val === null || val === undefined || val === '') return fallback;
      return val;
    });
    this.userFunctions.set('replace', (str: any, find: any, repl: any) => {
      return String(str ?? '').split(String(find ?? '')).join(String(repl ?? ''));
    });
    this.userFunctions.set('contains', (str: any, sub: any) => {
      return String(str ?? '').includes(String(sub ?? ''));
    });
    this.userFunctions.set('unicode_to_utf8', (s: any) => String(s ?? ''));
    this.userFunctions.set('log', (s: any) => {
      console.log('[G-Merge LOG]:', s);
      return '';
    });
  }

  public getVar(name: string): GMergeValue {
    const key = name.toLowerCase().replace(/[{}]/g, '').trim();
    return this.vars.get(key);
  }

  public setVar(name: string, value: GMergeValue) {
    const key = name.toLowerCase().replace(/[{}]/g, '').trim();
    this.vars.set(key, value);
  }
}

/**
 * Tokenizer & Expression Parser for G-Merge Mathematical and Logical Expressions
 */
export class GMergeExpressionParser {
  private input: string;
  private pos: number = 0;
  private env: GMergeEnvironment;

  constructor(input: string, env: GMergeEnvironment) {
    this.input = input.trim();
    this.env = env;
  }

  private skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private peek(): string {
    this.skipWhitespace();
    return this.input[this.pos] || '';
  }

  public parse(): GMergeValue {
    if (!this.input) return '';
    return this.parseLogicalOr();
  }

  // Precedence level 1 (lowest): OR
  private parseLogicalOr(): GMergeValue {
    let left = this.parseLogicalAnd();
    while (true) {
      this.skipWhitespace();
      if (this.matchKeyword('or') || this.matchKeyword('||')) {
        const right = this.parseLogicalAnd();
        left = Boolean(left || right);
      } else {
        break;
      }
    }
    return left;
  }

  // Precedence level 2: AND
  private parseLogicalAnd(): GMergeValue {
    let left = this.parseEquality();
    while (true) {
      this.skipWhitespace();
      if (this.matchKeyword('and') || this.matchKeyword('&&')) {
        const right = this.parseEquality();
        left = Boolean(left && right);
      } else {
        break;
      }
    }
    return left;
  }

  // Precedence level 3: =, !=, <, <=, >, >=
  private parseEquality(): GMergeValue {
    let left = this.parseAdditive();
    while (true) {
      this.skipWhitespace();
      if (this.input.startsWith('!=', this.pos) || this.input.startsWith('<>', this.pos)) {
        this.pos += 2;
        const right = this.parseAdditive();
        left = this.compareValues(left, right) !== 0;
      } else if (this.input.startsWith('<=', this.pos)) {
        this.pos += 2;
        const right = this.parseAdditive();
        left = this.compareValues(left, right) <= 0;
      } else if (this.input.startsWith('>=', this.pos)) {
        this.pos += 2;
        const right = this.parseAdditive();
        left = this.compareValues(left, right) >= 0;
      } else if (this.input.startsWith('==', this.pos)) {
        this.pos += 2;
        const right = this.parseAdditive();
        left = this.compareValues(left, right) === 0;
      } else if (this.input[this.pos] === '=' && this.input[this.pos + 1] !== '=') {
        this.pos += 1;
        const right = this.parseAdditive();
        left = this.compareValues(left, right) === 0;
      } else if (this.input[this.pos] === '<' && this.input[this.pos + 1] !== '=') {
        this.pos += 1;
        const right = this.parseAdditive();
        left = this.compareValues(left, right) < 0;
      } else if (this.input[this.pos] === '>' && this.input[this.pos + 1] !== '=') {
        this.pos += 1;
        const right = this.parseAdditive();
        left = this.compareValues(left, right) > 0;
      } else {
        break;
      }
    }
    return left;
  }

  private compareValues(a: any, b: any): number {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'boolean' || typeof b === 'boolean') {
      const aVal = Boolean(a);
      const bVal = Boolean(b);
      return aVal === bVal ? 0 : (aVal ? 1 : -1);
    }
    const aStr = String(a ?? '').toLowerCase();
    const bStr = String(b ?? '').toLowerCase();
    return aStr.localeCompare(bStr);
  }

  // Precedence level 4: +, -
  private parseAdditive(): GMergeValue {
    let left = this.parseMultiplicative();
    while (true) {
      this.skipWhitespace();
      const ch = this.input[this.pos];
      if (ch === '+' && this.input[this.pos + 1] !== '=') {
        this.pos++;
        const right = this.parseMultiplicative();
        // Date + Number = Date plus days
        if (left instanceof Date && typeof right === 'number') {
          const d = new Date(left.getTime());
          d.setDate(d.getDate() + right);
          left = d;
        } else if (typeof left === 'number' && right instanceof Date) {
          const d = new Date(right.getTime());
          d.setDate(d.getDate() + left);
          left = d;
        } else if (typeof left === 'number' && typeof right === 'number') {
          left = left + right;
        } else {
          // String concatenation
          left = String(left ?? '') + String(right ?? '');
        }
      } else if (ch === '-' && this.input[this.pos + 1] !== '=' && !this.isUnaryMinusNext()) {
        this.pos++;
        const right = this.parseMultiplicative();
        // Date - Number = Date minus days
        if (left instanceof Date && typeof right === 'number') {
          const d = new Date(left.getTime());
          d.setDate(d.getDate() - right);
          left = d;
        } else if (left instanceof Date && right instanceof Date) {
          // Date - Date = number of days
          const diffMs = left.getTime() - right.getTime();
          left = Math.round(diffMs / (1000 * 60 * 60 * 24));
        } else {
          left = (Number(left) || 0) - (Number(right) || 0);
        }
      } else {
        break;
      }
    }
    return left;
  }

  private isUnaryMinusNext(): boolean {
    return false;
  }

  // Precedence level 5: *, /, %, ^
  private parseMultiplicative(): GMergeValue {
    let left = this.parseUnary();
    while (true) {
      this.skipWhitespace();
      const ch = this.input[this.pos];
      if (ch === '*' && this.input[this.pos + 1] !== '=') {
        this.pos++;
        const right = this.parseUnary();
        left = (Number(left) || 0) * (Number(right) || 0);
      } else if (ch === '/' && this.input[this.pos + 1] !== '=') {
        this.pos++;
        const right = this.parseUnary();
        const denom = Number(right) || 0;
        left = denom === 0 ? 0 : (Number(left) || 0) / denom;
      } else if (ch === '%' && this.input[this.pos + 1] !== '=') {
        this.pos++;
        const right = this.parseUnary();
        left = (Number(left) || 0) % (Number(right) || 1);
      } else if (ch === '^') {
        this.pos++;
        const right = this.parseUnary();
        left = Math.pow(Number(left) || 0, Number(right) || 0);
      } else {
        break;
      }
    }
    return left;
  }

  // Precedence level 6: Unary ! and -
  private parseUnary(): GMergeValue {
    this.skipWhitespace();
    if (this.input[this.pos] === '!') {
      this.pos++;
      const val = this.parseUnary();
      return !Boolean(val);
    }
    if (this.input[this.pos] === '-' && (this.pos + 1 < this.input.length && (/\d/.test(this.input[this.pos + 1]) || this.input[this.pos + 1] === '('))) {
      this.pos++;
      const val = this.parseUnary();
      return -(Number(val) || 0);
    }
    return this.parsePrimary();
  }

  // Precedence level 7: Primary (Literals, Parens, Identifiers, Calls)
  private parsePrimary(): GMergeValue {
    this.skipWhitespace();
    const ch = this.input[this.pos];

    // Parentheses (expr)
    if (ch === '(') {
      this.pos++;
      const val = this.parseLogicalOr();
      this.skipWhitespace();
      if (this.input[this.pos] === ')') {
        this.pos++;
      }
      return val;
    }

    // String literal "..." with "" escaping
    if (ch === '"') {
      this.pos++;
      let str = '';
      while (this.pos < this.input.length) {
        if (this.input[this.pos] === '"') {
          if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === '"') {
            str += '"';
            this.pos += 2;
          } else {
            this.pos++;
            break;
          }
        } else {
          str += this.input[this.pos];
          this.pos++;
        }
      }
      return str;
    }

    // Date literal #...#
    if (ch === '#') {
      this.pos++;
      let dateStr = '';
      while (this.pos < this.input.length && this.input[this.pos] !== '#') {
        dateStr += this.input[this.pos];
        this.pos++;
      }
      if (this.input[this.pos] === '#') {
        this.pos++;
      }
      const parsedDate = parseGMergeDateLiteral(dateStr);
      return parsedDate || dateStr;
    }

    // Number literal
    if (/\d/.test(ch)) {
      let numStr = '';
      while (this.pos < this.input.length && /[\d.]/.test(this.input[this.pos])) {
        numStr += this.input[this.pos];
        this.pos++;
      }
      return numStr.includes('.') ? parseFloat(numStr) : parseInt(numStr, 10);
    }

    // Braced identifier e.g. {purchase date}
    if (ch === '{') {
      this.pos++;
      let varName = '';
      while (this.pos < this.input.length && this.input[this.pos] !== '}') {
        varName += this.input[this.pos];
        this.pos++;
      }
      if (this.input[this.pos] === '}') {
        this.pos++;
      }
      return this.env.getVar(varName);
    }

    // Identifier / Keyword / Predefined / Function Call
    let ident = '';
    while (this.pos < this.input.length && /[a-zA-Z0-9_\-$@]/.test(this.input[this.pos])) {
      ident += this.input[this.pos];
      this.pos++;
    }

    if (!ident) {
      this.pos++;
      return '';
    }

    const lower = ident.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'null') return null;

    // Check if it's a function call ident(...)
    this.skipWhitespace();
    if (this.input[this.pos] === '(') {
      this.pos++;
      const args: any[] = [];
      this.skipWhitespace();
      if (this.input[this.pos] !== ')') {
        while (this.pos < this.input.length) {
          const arg = this.parseLogicalOr();
          args.push(arg);
          this.skipWhitespace();
          if (this.input[this.pos] === ',') {
            this.pos++;
          } else {
            break;
          }
        }
      }
      if (this.input[this.pos] === ')') {
        this.pos++;
      }
      const fn = this.env.userFunctions.get(lower);
      if (fn) {
        try {
          return fn(...args);
        } catch (e: any) {
          console.warn(`Error calling function ${ident}:`, e);
          return '';
        }
      }
      return '';
    }

    // Regular variable or database column lookup
    return this.env.getVar(ident);
  }

  private matchKeyword(kw: string): boolean {
    const end = this.pos + kw.length;
    if (this.input.substring(this.pos, end).toLowerCase() === kw.toLowerCase()) {
      // Must be followed by non-identifier character or end
      if (end >= this.input.length || /[\s(!]/.test(this.input[end])) {
        this.pos = end;
        return true;
      }
    }
    return false;
  }
}

/**
 * Executes a single sub-statement inside a G-Merge block (semicolon delimited).
 */
export function executeGMergeSubStatement(stmt: string, env: GMergeEnvironment): { output: string; raw: boolean } {
  let trimmed = stmt.trim();
  if (!trimmed) return { output: '', raw: false };

  let isRaw = false;
  if (/^raw\s+/i.test(trimmed)) {
    isRaw = true;
    trimmed = trimmed.replace(/^raw\s+/i, '').trim();
  }

  // 1. "var" statement: [[var foo=5, bar="abc"]]
  if (/^var\s+/i.test(trimmed)) {
    const decls = trimmed.replace(/^var\s+/i, '').trim();
    // Split declarations by comma, taking into account strings
    const parts = splitCommaExpressions(decls);
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx > 0) {
        const varName = part.substring(0, eqIdx).trim();
        const expr = part.substring(eqIdx + 1).trim();
        const parser = new GMergeExpressionParser(expr, env);
        const val = parser.parse();
        env.setVar(varName, val);
      }
    }
    return { output: '', raw: false };
  }

  // 2. "let" statement: [[let cost = 675.95]], [[let count += 1]], [[let foo = bar]]
  if (/^let\s+/i.test(trimmed)) {
    const assignments = trimmed.replace(/^let\s+/i, '').trim();
    const parts = splitCommaExpressions(assignments);
    for (const part of parts) {
      if (part.includes('+=')) {
        const [varName, expr] = part.split('+=', 2).map(s => s.trim());
        const current = env.getVar(varName);
        const parser = new GMergeExpressionParser(expr, env);
        const added = parser.parse();
        if (current instanceof Date && typeof added === 'number') {
          const d = new Date(current.getTime());
          d.setDate(d.getDate() + added);
          env.setVar(varName, d);
        } else if (typeof current === 'number' && typeof added === 'number') {
          env.setVar(varName, current + added);
        } else {
          env.setVar(varName, String(current ?? '') + String(added ?? ''));
        }
      } else if (part.includes('-=')) {
        const [varName, expr] = part.split('-=', 2).map(s => s.trim());
        const current = env.getVar(varName);
        const parser = new GMergeExpressionParser(expr, env);
        const subtracted = parser.parse();
        if (current instanceof Date && typeof subtracted === 'number') {
          const d = new Date(current.getTime());
          d.setDate(d.getDate() - subtracted);
          env.setVar(varName, d);
        } else {
          env.setVar(varName, (Number(current) || 0) - (Number(subtracted) || 0));
        }
      } else if (part.includes('=')) {
        const [varName, expr] = part.split('=', 2).map(s => s.trim());
        const parser = new GMergeExpressionParser(expr, env);
        const val = parser.parse();
        env.setVar(varName, val);
      }
    }
    return { output: '', raw: false };
  }

  // 3. User-defined function definition: function name(a, b) ... endfunction
  if (/^function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(.*?)(?:endfunction|$)/is.test(trimmed)) {
    const match = trimmed.match(/^function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(.*?)(?:endfunction|$)/is);
    if (match) {
      const fnName = match[1].toLowerCase();
      const argNames = match[2].split(',').map(s => s.trim()).filter(Boolean);
      const fnBody = match[3].trim().replace(/^return\s+/i, '');
      env.userFunctions.set(fnName, (...callArgs: any[]) => {
        const subEnv = new GMergeEnvironment(env.context);
        // Copy existing vars
        for (const [k, v] of env.vars.entries()) subEnv.vars.set(k, v);
        for (const [k, f] of env.userFunctions.entries()) subEnv.userFunctions.set(k, f);
        argNames.forEach((arg, i) => subEnv.setVar(arg, callArgs[i]));
        const parser = new GMergeExpressionParser(fnBody, subEnv);
        return parser.parse();
      });
      return { output: '', raw: false };
    }
  }

  // 4. Data Switching: [[Color|1|red|2|blue|3|green]] or [[Color|1|red|2|blue|3|green|black]]
  if (trimmed.includes('|') && !trimmed.startsWith('"')) {
    const switchParts = trimmed.split('|').map(s => s.trim());
    if (switchParts.length >= 3) {
      const colName = switchParts[0];
      const colVal = String(env.getVar(colName) ?? '').trim();

      const pairsCount = Math.floor((switchParts.length - 1) / 2);
      let matchedText: string | null = null;

      for (let p = 0; p < pairsCount; p++) {
        const matchVal = switchParts[1 + p * 2];
        const resultText = switchParts[2 + p * 2];
        if (colVal.toLowerCase() === matchVal.toLowerCase()) {
          matchedText = resultText;
          break;
        }
      }

      if (matchedText !== null) {
        return { output: matchedText, raw: isRaw };
      }

      // Check if there is an odd trailing item (the default fallback)
      if ((switchParts.length - 1) % 2 === 1) {
        const defaultText = switchParts[switchParts.length - 1];
        return { output: defaultText, raw: isRaw };
      }

      // Else insert actual column value
      return { output: colVal, raw: isRaw };
    }
  }

  // 5. Variable Defaults or Inline Date Format: [[-FirstName-:Customer]], [[-Now-:m/d/y]], [[{purchase date}:MM D, yy]]
  if (trimmed.includes(':') && !trimmed.startsWith('"') && !trimmed.startsWith('#')) {
    const colonIdx = trimmed.indexOf(':');
    const varPart = trimmed.substring(0, colonIdx).trim();
    const restPart = trimmed.substring(colonIdx + 1).trim();

    let val: any = env.getVar(varPart);
    if (val === undefined) {
      try {
        const parser = new GMergeExpressionParser(varPart, env);
        val = parser.parse();
      } catch {
        val = undefined;
      }
    }

    // If value is a Date, format it!
    if (val instanceof Date) {
      return { output: formatGMergeDate(val, restPart), raw: isRaw };
    }
    // If restPart looks like a date format string and val can be parsed as a date
    if (typeof val === 'string' && val && parseGMergeDateLiteral(val)) {
      const d = parseGMergeDateLiteral(val);
      if (d) return { output: formatGMergeDate(d, restPart), raw: isRaw };
    }

    // Otherwise, Variable Default: if empty, substitute restPart
    if (val === null || val === undefined || val === '') {
      return { output: restPart, raw: isRaw };
    }
    return { output: String(val), raw: isRaw };
  }

  // 6. Inline Date literal formatting: [[#5/Dec/96#:d-MM-yy]]
  if (/^#([^#]+)#:(.+)$/.test(trimmed)) {
    const m = trimmed.match(/^#([^#]+)#:(.+)$/);
    if (m) {
      const d = parseGMergeDateLiteral(m[1]);
      if (d) return { output: formatGMergeDate(d, m[2].trim()), raw: isRaw };
    }
  }

  // 7. General Expression Evaluator (Math, Functions, String Concatenation, Logical)
  const parser = new GMergeExpressionParser(trimmed, env);
  const result = parser.parse();

  if (result instanceof Date) {
    return { output: formatGMergeDate(result, 'm/d/yy'), raw: isRaw };
  }
  if (result === null || result === undefined) {
    return { output: '', raw: isRaw };
  }
  return { output: String(result), raw: isRaw };
}

/**
 * Split comma-separated expressions while respecting quotes and parentheses
 */
function splitCommaExpressions(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if (ch === '(' && !inQuote) {
      parenDepth++;
      current += ch;
    } else if (ch === ')' && !inQuote) {
      if (parenDepth > 0) parenDepth--;
      current += ch;
    } else if (ch === ',' && !inQuote && parenDepth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

/**
 * Evaluates full conditional blocks:
 * [[if cond]] body1 [[elseif cond2]] body2 [[else]] body3 [[endif]]
 */
export function evaluateConditionals(template: string, env: GMergeEnvironment): string {
  // Regex to find [[if ...]] statements
  // Note: we support nested if statements by recursively finding matched [[if]] and [[endif]] pairs!
  let output = '';
  let i = 0;
  const len = template.length;

  while (i < len) {
    // Check for [[if ...]]
    const ifMatch = template.substring(i).match(/^\[\[\s*if\s+(.*?)\]\]/is);
    if (ifMatch) {
      const ifStart = i;
      const initialCondition = ifMatch[1];
      let cursor = i + ifMatch[0].length;
      let depth = 1;

      // Collect all branches: [ { condition: string | null, body: string } ]
      const branches: { condition: string | null; body: string }[] = [];
      let currentCondition: string | null = initialCondition;
      let currentBody = '';

      while (cursor < len && depth > 0) {
        // Check for nested [[if ...]]
        const nestedIfMatch = template.substring(cursor).match(/^\[\[\s*if\b/is);
        if (nestedIfMatch) {
          depth++;
          currentBody += nestedIfMatch[0];
          cursor += nestedIfMatch[0].length;
          continue;
        }

        // Check for [[endif]]
        const endifMatch = template.substring(cursor).match(/^\[\[\s*endif\s*\]\]/is);
        if (endifMatch) {
          depth--;
          if (depth === 0) {
            branches.push({ condition: currentCondition, body: currentBody });
            cursor += endifMatch[0].length;
            break;
          } else {
            currentBody += endifMatch[0];
            cursor += endifMatch[0].length;
            continue;
          }
        }

        // Check for [[elseif ...]] at top depth
        const elseifMatch = template.substring(cursor).match(/^\[\[\s*elseif\s+(.*?)\]\]/is);
        if (elseifMatch && depth === 1) {
          branches.push({ condition: currentCondition, body: currentBody });
          currentCondition = elseifMatch[1];
          currentBody = '';
          cursor += elseifMatch[0].length;
          continue;
        }

        // Check for [[else]] at top depth
        const elseMatch = template.substring(cursor).match(/^\[\[\s*else\s*\]\]/is);
        if (elseMatch && depth === 1) {
          branches.push({ condition: currentCondition, body: currentBody });
          currentCondition = null; // else branch
          currentBody = '';
          cursor += elseMatch[0].length;
          continue;
        }

        currentBody += template[cursor];
        cursor++;
      }

      // Evaluate which branch should execute
      let chosenBody = '';
      for (const branch of branches) {
        if (branch.condition === null) {
          // else branch
          chosenBody = branch.body;
          break;
        }
        // Evaluate condition
        const parser = new GMergeExpressionParser(branch.condition, env);
        const condResult = parser.parse();
        if (Boolean(condResult)) {
          chosenBody = branch.body;
          break;
        }
      }

      // Recursively evaluate any conditionals inside chosen body
      const evaluatedChosen = evaluateConditionals(chosenBody, env);
      output += evaluatedChosen;
      i = cursor;
      continue;
    }

    output += template[i];
    i++;
  }

  return output;
}

/**
 * Main Template Evaluator
 * Evaluates all G-Merge blocks in a template string against the provided context.
 */
export function evaluateGMergeTemplate(template: string, context: GMergeContext = {}): string {
  if (!template) return '';

  const env = new GMergeEnvironment(context);

  // Step 1: Escape triple brackets [[[ -> temp placeholder
  const ESCAPED_BRACKET = '__GMERGE_ESCAPED_DOUBLE_BRACKET__';
  let processed = template.replace(/\[\[\[/g, ESCAPED_BRACKET);

  // Step 2: Handle conditionals [[if ...]] ... [[endif]]
  processed = evaluateConditionals(processed, env);

  // Step 3: Handle all remaining standard [[ ... ]] statements
  // Regex to match [[ ... ]] blocks
  const statementRegex = /\[\[([\s\S]*?)\]\]/g;
  processed = processed.replace(statementRegex, (_, stmtContent) => {
    // Strip comments (//, /* */, rem)
    const cleaned = stripGMergeComments(stmtContent).trim();
    if (!cleaned) return '';

    // Handle compound statements separated by semicolons: [[12; 34]]
    const subStatements = splitSemicolonStatements(cleaned);
    let blockOutput = '';

    for (const sub of subStatements) {
      const { output } = executeGMergeSubStatement(sub, env);
      blockOutput += output;
    }

    return blockOutput;
  });

  // Step 4: Backwards-compatible replacement for legacy {{var}} and {{var | 'fallback'}}
  processed = replaceLegacyMustacheTokens(processed, env);

  // Step 5: Restore escaped brackets
  processed = processed.replace(new RegExp(ESCAPED_BRACKET, 'g'), '[[');

  return processed;
}

/**
 * Splits semicolon-separated statements while respecting quotes and parentheses
 */
function splitSemicolonStatements(input: string): string[] {
  const stmts: string[] = [];
  let current = '';
  let inQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if (ch === '(' && !inQuote) {
      parenDepth++;
      current += ch;
    } else if (ch === ')' && !inQuote) {
      if (parenDepth > 0) parenDepth--;
      current += ch;
    } else if (ch === ';' && !inQuote && parenDepth === 0) {
      if (current.trim()) stmts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    stmts.push(current.trim());
  }
  return stmts;
}

/**
 * Backwards compatibility for legacy {{var}} and {{var | 'fallback'}}
 */
function replaceLegacyMustacheTokens(text: string, env: GMergeEnvironment): string {
  const pattern = /\{\{\s*([a-zA-Z0-9_\-$]+)(?:\s*\|\s*['"]([^'"]+)['"])?\s*\}\}/gi;
  return text.replace(pattern, (_, varName, fallback) => {
    const val = env.getVar(varName);
    if (val !== undefined && val !== null && String(val).trim()) {
      return String(val);
    }
    return fallback !== undefined ? fallback : '';
  });
}
