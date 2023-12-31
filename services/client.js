'use strict';

const queries = require('database/queries');
const brazilianStates = require('resources/brazilianStates');
const errors = require('utils/errors');
const files = require('utils/files');
const {Client, Company, DefaultTask, PaymentOrder, Plan, Task, TaskAttachment, TaskComment} = require('models');
const cepPromise = require('cep-promise');
const _ = require('lodash');

const DEFAULT_PHOTO_URL = 'https://cdn.intercamb.me/images/client_default_photo.png';
const UNALLOWED_ATTRS = ['_id', 'id', 'company', 'photo_url', 'registration_date'];

exports.getClient = async (id, options) => {
  return queries.get(Client, id, options);
};

exports.createClient = async (company, data) => {
  const loadedCompany = await queries.get(Company, company.id, {select: '_id'});
  const defaultTasks = await queries.list(DefaultTask, (query) => {
    query.where('company').equals(loadedCompany.id);
    query.or([
      {plan: {$exists: false}},
      {plan: {$eq: null}},
    ]);
  });
  const client = new Client(data);
  client.company = loadedCompany.id;
  client.registration_date = new Date();
  client.photo_url = DEFAULT_PHOTO_URL;
  client.metadata = {
    messages_sent: [],
  };
  const now = new Date();
  const tasks = [];
  defaultTasks.forEach((defaultTask) => {
    tasks.push(new Task({
      company: loadedCompany.id,
      client: client.id,
      name: defaultTask.name,
      status: 'pending',
      checklists: defaultTask.checklists,
      fields: defaultTask.fields,
      counters: {
        attachments: 0,
        comments: 0,
      },
      registration_date: now,
    }));
  });
  await client.save();
  await Task.insertMany(tasks);
  return client;
};

exports.updateClient = async (client, data) => {
  const attrs = _.omit(data, UNALLOWED_ATTRS);
  const loadedClient = await queries.get(Client, client.id);
  attrs.needs_revision = false;
  loadedClient.set(attrs);
  return loadedClient.save();
};

exports.updateClientPhoto = async (client, photoFile) => {
  const loadedClient = await queries.get(Client, client.id);
  const photoUrl = await files.uploadClientPhoto(loadedClient, photoFile.path);
  loadedClient.photo_url = photoUrl;
  return loadedClient.save();
};

exports.deleteClient = async (client) => {
  const loadedClient = await queries.get(Client, client.id, {select: '_id'});
  const tasks = await queries.list(Task, {client: loadedClient.id}, {select: '_id'});
  const tasksIds = _.map(tasks, task => task.id);
  await TaskAttachment.deleteMany({task: tasksIds});
  await TaskComment.deleteMany({task: tasksIds});
  await Task.deleteMany({client: loadedClient.id});
  await PaymentOrder.deleteMany({client: loadedClient.id});
  await loadedClient.remove();
  await files.deleteClientMedia(loadedClient);
};

exports.createTask = async (company, client, name) => {
  const task = new Task({
    name,
    company: company.id,
    client: client.id,
    status: 'pending',
    counters: {
      attachments: 0,
      comments: 0,
    },
    registration_date: new Date(),
  });
  return task.save();
};

exports.listTasks = async (client, options) => {
  return queries.list(Task, {client: client.id}, options);
};

exports.associatePlan = async (client, plan) => {
  const loadedPlan = await queries.get(Plan, plan.id, {select: '_id', populate: 'default_tasks'});
  const loadedClient = await queries.get(Client, client.id, {select: 'company plan'});
  if (loadedClient.plan) {
    const planTasks = await queries.list(Task, {client: loadedClient.id, plan: loadedClient.plan}, {select: 'client'});
    const deleteMediaPromises = [];
    planTasks.forEach((planTask) => {
      deleteMediaPromises.push(files.deleteTaskMedia(planTask));
    });
    await Promise.all(deleteMediaPromises);
    await Task.deleteMany({_id: _.map(planTasks, task => task.id)});
  }
  loadedClient.plan = loadedPlan.id;
  await loadedClient.save();
  const now = new Date();
  const tasks = [];
  loadedPlan.default_tasks.forEach((defaultTask) => {
    tasks.push(new Task({
      company: loadedClient.company,
      client: client.id,
      plan: loadedPlan.id,
      name: defaultTask.name,
      status: 'pending',
      checklists: defaultTask.checklists,
      fields: defaultTask.fields,
      counters: {
        attachments: 0,
        comments: 0,
      },
      registration_date: now,
    }));
  });
  await Task.insertMany(tasks);
};

exports.dissociatePlan = async (client) => {
  const loadedClient = await queries.get(Client, client.id, {select: 'plan'});
  if (loadedClient.plan) {
    const planId = loadedClient.plan;
    loadedClient.plan = null;
    await loadedClient.save();
    await Task.deleteMany({client: loadedClient.id, plan: planId});
  }
};

exports.createPaymentOrders = async (client, paymentOrders) => {
  const loadedClient = await queries.get(Client, client.id, {select: 'company'});
  const orders = [];
  _.forEach(paymentOrders, (paymentOrder) => {
    const order = new PaymentOrder({
      client: loadedClient.id,
      company: loadedClient.company,
      method: paymentOrder.method,
      amount: paymentOrder.amount,
      due_date: paymentOrder.due_date,
      registration_date: new Date(),
    });
    orders.push(order);
  });
  return PaymentOrder.insertMany(orders);
};

exports.listPaymentOrders = async (client, options) => {
  return queries.list(PaymentOrder, {client: client.id}, options);
};

exports.searchAddress = async (code) => {
  try {
    const address = await cepPromise(code);
    return {
      zip_code: address.cep,
      city: address.city,
      state: brazilianStates[address.state],
      neighborhood: address.neighborhood,
      public_place: address.street,
    };
  } catch (err) {
    throw errors.notFoundError('address_not_found', 'Address not found');
  }
};
