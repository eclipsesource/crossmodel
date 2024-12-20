hidden terminal WS: /\s+/;

terminal STRING: /"[^"]*"/; /* JSON only supports double quoted strings */

terminal INT returns number: /(-)?[0-9]+/;
terminal NUMBER returns number: /(-)?[0-9]+(\.[0-9]*)?/;

terminal BOOLEAN returns boolean: /true|false|TRUE|FALSE/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;