'use strict';

const queries = require('database/queries');
const errors = require('utils/errors');
const files = require('utils/files');
const {Account, Company, Client, DefaultTask, Institution, PaymentOrder, Plan, Task} = require('models');
const DateOnly = require('dateonly');
const dateFns = require('date-fns');
const _ = require('lodash');

const DEFAULT_LOGO_URL = 'https://cdn.intercamb.me/images/company_default_logo.png';
const DEFAULT_CURRENCY = 'BRL';
const DEFAULT_TASKS = ['Contrato', 'Identidade', 'Passaporte', 'Certidão de nascimento', 'Certificado de ensino médio', 'Histórico do ensino médio', 'Inscrição no curso', 'Recepção', 'Antecedentes criminais', 'Antecedentes criminais (Argentina)', 'Identidade (Argentina)'];
const ALLOWED_ATTRS = ['name', 'contact_email', 'contact_phone', 'website', 'primary_color', 'text_color', 'institutions'];

exports.listAllInstitutions = async () => {
  const institutions = await queries.list(Institution);
  return _.sortBy(institutions, (institution) => {
    return institution.name.toLowerCase();
  });
};

exports.getCompany = async (id, options) => {
  return queries.get(Company, id, options);
};

exports.createCompany = async (account, data) => {
  if (!data.name) throw errors.apiError('company_name_required', 'Name required');
  if (!data.contact_email) throw errors.apiError('company_contact_email_required', 'Contact email required');
  if (!data.contact_phone) throw errors.apiError('company_contact_phone_required', 'Contact phone required');
  const website = data.website ? data.website.trim() : undefined;
  const company = new Company({
    website,
    name: data.name.trim(),
    contact_email: data.contact_email.trim(),
    contact_phone: data.contact_phone.trim(),
    owner: account.id,
    logo_url: DEFAULT_LOGO_URL,
    currency: DEFAULT_CURRENCY,
    registration_date: new Date(),
  });
  await company.save();
  await account.updateOne({company: company.id});
  const now = new Date();
  const defaultTasks = [];
  DEFAULT_TASKS.forEach((taskName) => {
    defaultTasks.push(new DefaultTask({
      company: company.id,
      name: taskName,
      registration_date: now,
    }));
  });
  await DefaultTask.insertMany(defaultTasks);
  return company;
};

exports.updateCompany = async (company, data) => {
  const attrs = _.pick(data, ALLOWED_ATTRS);
  if (attrs.institutions) {
    const institutionsSet = new Set(attrs.institutions);
    attrs.institutions = [...institutionsSet];
  }
  const loadedCompany = await queries.get(Company, company.id);
  loadedCompany.set(attrs);
  return loadedCompany.save();
};

exports.updateCompanyLogo = async (company, logoFile) => {
  const loadedCompany = await queries.get(Company, company.id);
  const logoUrl = await files.uploadCompanyLogo(loadedCompany, logoFile.path);
  loadedCompany.logo_url = logoUrl;
  return loadedCompany.save();
};

exports.listAccounts = async (company, options) => {
  return queries.list(Account, {company: company.id}, options);
};

exports.listPlans = async (company, options) => {
  return queries.list(Plan, {company: company.id}, options);
};

exports.listClients = async (company, ids, options) => {
  return queries.list(Client, (query) => {
    query.where('company').equals(company.id);
    if (ids) {
      query.where('_id').in(ids);
    }
  }, options);
};

exports.listClientsToReview = async (company, ids, options) => {
  return queries.list(Client, (query) => {
    query.where('company').equals(company.id);
    query.where('needs_revision').equals(true);
    query.sort('-registration_date');
  }, options);
};

exports.searchClients = async (company, search, options) => {
  const regexp = new RegExp(search, 'i');
  return queries.list(Client, (query) => {
    query.where('company').equals(company.id);
    query.or([
      {forename: regexp},
      {surname: regexp},
      {email: regexp},
      {phone: regexp},
    ]);
    query.sort('-registration_date');
  }, options);
};

exports.countClients = async (company) => {
  return Client.countDocuments({company: company.id});
};

exports.listScheduledTasks = async (company, startDate, endDate, options) => {
  return queries.list(Task, (query) => {
    query.where('company').equals(company.id);
    query.where('status').equals('pending');
    query.where('schedule_date').gte(startDate).lte(endDate);
    query.sort('schedule_date');
    query.sort('name');
  }, options);
};

exports.listPendingPaymentOrders = async (company, options) => {
  let today = new Date();
  today = dateFns.startOfDay(today);
  return queries.list(PaymentOrder, (query) => {
    query.where('company').equals(company.id);
    query.or([
      {payment_date: {$exists: false}},
      {payment_date: {$eq: null}},
    ]);
    query.where('due_date').gte(today);
    query.sort('due_date');
  }, options);
};

exports.listOverduePaymentOrders = async (company, options) => {
  let today = new Date();
  today = dateFns.startOfDay(today);
  return queries.list(PaymentOrder, (query) => {
    query.where('company').equals(company.id);
    query.or([
      {payment_date: {$exists: false}},
      {payment_date: {$eq: null}},
    ]);
    query.where('due_date').lt(today);
    query.sort('due_date');
  }, options);
};

exports.getClientsPerMonthReport = async (company) => {
  let startDate = new Date();
  startDate = dateFns.startOfMonth(startDate);
  startDate = dateFns.addMonths(startDate, -12);
  const aggregate = Client.aggregate();
  aggregate.match({company: company._id, registration_date: {$gte: startDate}});
  aggregate.group({
    _id: {
      year: {$year: '$registration_date'},
      month: {$month: '$registration_date'},
    },
    count: {$sum: 1},
  });
  return aggregate.exec();
};

exports.getClientsPerPlanReport = async (company) => {
  let startDate = new Date();
  startDate = dateFns.startOfMonth(startDate);
  startDate = dateFns.addMonths(startDate, -12);
  const aggregate = Client.aggregate();
  aggregate.match({company: company._id, registration_date: {$gte: startDate}});
  aggregate.group({
    _id: '$plan',
    count: {$sum: 1},
  });
  return aggregate.exec();
};

exports.getBillingPerMonthReport = async (company) => {
  let startDate = new Date();
  startDate = dateFns.startOfMonth(startDate);
  startDate = dateFns.addMonths(startDate, -12);
  const aggregate = PaymentOrder.aggregate();
  aggregate.match({company: company._id, payment_date: {$gte: new DateOnly(startDate).valueOf()}});
  aggregate.group({
    _id: {
      $let: {
        vars: {
          date: {
            $dateFromString: {
              dateString: {
                $toString: {
                  $toLong: {
                    $add: ['$payment_date', 100],
                  },
                },
              },
              format: '%Y%m%d',
            },
          },
        },
        in: {
          year: {$year: '$$date'},
          month: {$month: '$$date'},
        },
      },
    },
    amount: {$sum: '$amount'},
  });
  return aggregate.exec();
};
