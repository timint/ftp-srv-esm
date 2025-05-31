import abor from './registration/abor.js';
import allo from './registration/allo.js';
import appe from './registration/appe.js';
import auth from './registration/auth.js';
import cdup from './registration/cdup.js';
import cwd from './registration/cwd.js';
import dele from './registration/dele.js';
import feat from './registration/feat.js';
import help, { setHelpRegistry } from './registration/help.js';
import list from './registration/list.js';
import mdtm from './registration/mdtm.js';
import mkd from './registration/mkd.js';
import mode from './registration/mode.js';
import nlst from './registration/nlst.js';
import noop from './registration/noop.js';
import opts from './registration/opts.js';
import pass from './registration/pass.js';
import pasv from './registration/pasv.js';
import port from './registration/port.js';
import pwd from './registration/pwd.js';
import quit from './registration/quit.js';
import rest from './registration/rest.js';
import retr from './registration/retr.js';
import rmd from './registration/rmd.js';
import rnfr from './registration/rnfr.js';
import rnto from './registration/rnto.js';
import site from './registration/site/index.js';
import size from './registration/size.js';
import stat from './registration/stat.js';
import stor from './registration/stor.js';
import stou from './registration/stou.js';
import stru from './registration/stru.js';
import syst from './registration/syst.js';
import type from './registration/type.js';
import user from './registration/user.js';
import pbsz from './registration/pbsz.js';
import prot from './registration/prot.js';
import eprt from './registration/eprt.js';
import epsv from './registration/epsv.js';

const commands = [
  abor, allo, appe, auth, cdup, cwd, dele, feat, help, list, mdtm, mkd, mode,
  nlst, noop, opts, pass, pasv, port, pwd, quit, rest, retr, rmd, rnfr, rnto,
  site, size, stat, stor, stou, stru, syst, type, user, pbsz, prot, eprt, epsv
];

const registry = commands.reduce((result, cmd) => {
  const aliases = Array.isArray(cmd.directive) ? cmd.directive : [cmd.directive];
  aliases.forEach((alias) => result[alias] = cmd);
  return result;
}, {});

setHelpRegistry(registry);

export default registry;
