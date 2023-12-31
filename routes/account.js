'use strict';

const settings = require('configs/settings');
const {accountAuthenticated, decodeToken} = require('routes/middlewares');
const accountService = require('services/account');
const invitationService = require('services/invitation');
const session = require('database/session');
const errors = require('utils/errors');
const logger = require('utils/logger');
const {Company} = require('models');
const multer = require('multer');

const upload = multer({dest: settings.uploadsPath});

async function createAccount(req, res) {
  try {
    let invitation;
    let company;
    if (req.query.invitation) {
      invitation = await invitationService.getInvitation(req.query.invitation);
      company = new Company({id: invitation.company});
    }
    const account = await accountService.createAccount(req.body, company);
    if (invitation) {
      await invitationService.removeInvitation(invitation);
    }
    res.json(account);
  } catch (err) {
    logger.error(err);
    errors.respondWithError(res, err);
  }
}

async function getAccount(req, res) {
  try {
    await decodeToken(req);
    if (req.account) {
      const account = await accountService.getAccount(req.account.id);
      res.json(account);
    } else {
      res.json(null);
    }
  } catch (err) {
    if (err.code === 'token_expired') {
      res.json(null);
      return;
    }
    logger.error(err);
    errors.respondWithError(res, err);
  }
}

async function updateAccount(req, res) {
  try {
    const account = await accountService.updateAccount(req.account, req.body);
    res.json(account);
  } catch (err) {
    logger.error(err);
    errors.respondWithError(res, err);
  }
}

async function updateAccountImage(req, res) {
  try {
    const account = await accountService.updateAccountImage(req.account, req.file);
    res.json(account);
  } catch (err) {
    logger.error(err);
    errors.respondWithError(res, err);
  }
}

async function login(req, res) {
  try {
    const account = await accountService.authenticate(req.body.email, req.body.password);
    const token = await session.createToken(account);
    res.json({token, account});
  } catch (err) {
    logger.error(err);
    errors.respondWithError(res, err);
  }
}

async function logout(req, res) {
  try {
    if (req.token) {
      await session.destroyToken(req.token);
    }
    res.json({});
  } catch (err) {
    logger.error(err);
    errors.respondWithError(res, err);
  }
}

module.exports = (express, app) => {
  const router = express.Router({mergeParams: true});
  router.post('', createAccount);
  router.get('/current', getAccount);
  router.put('/current', accountAuthenticated, updateAccount);
  router.put('/current/image', [accountAuthenticated, upload.single('image')], updateAccountImage);
  router.post('/login', login);
  router.post('/logout', logout);
  app.use('/accounts', router);
};
