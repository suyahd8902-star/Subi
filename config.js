// config.js - list of candidate public Searx instances.
// The script will try them in order until one works.
// You can add or remove instances here anytime.
const CONFIG = {
  instances: [
    "https://searx.tiekoetter.com",
    "https://searx.laquadrature.net",
    "https://searx.org",            // sometimes present as a redirect
    "https://searx.be",            // add more if you find them on searx.space
    "https://searx.space"
  ],
  perPage: 10,     // heuristic: how many results per page the instance returns
  timeoutMs: 8000  // timeout for each instance request
};
