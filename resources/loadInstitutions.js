'use strict';

const path = require('path');

require('app-module-path').addPath(path.resolve());

const queries = require('database/queries');
const institutionsArgentina = require('resources/institutionsAR');
const {Institution} = require('models');
const _ = require('lodash');

function contains(institutions, institution) {
  const institutionFound = _.find(institutions, (currentInstitution) => {
    return currentInstitution.name === institution.name;
  });
  return !_.isNil(institutionFound);
}

async function exec() {
  const institutions = await queries.list(Institution);
  const institutionsToSave = [];
  _.forEach(institutionsArgentina, async (institution) => {
    if (!contains(institutions, institution)) {
      institutionsToSave.push(new Institution({
        country: institution.country,
        name: institution.name,
        acronym: institution.acronym,
      }));
    } else {
      await Institution.updateOne({name: institution.name}, institution);
    }
  });
  await Institution.insertMany(institutionsToSave);
  process.exit(0);
}

exec();
