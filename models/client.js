'use strict';

const mongoose = require('mongoose');
const DateOnly = require('mongoose-dateonly')(mongoose);

const {Schema} = mongoose;
const {ObjectId} = Schema.Types;

const PlaceOfBirth = new Schema({
  city: {type: String},
  state: {type: String},
}, {_id: false});

const IdentityDocument = new Schema({
  number: {type: String},
  issuing_authority: {type: String},
  state: {type: String},
}, {_id: false});

const PersonalData = new Schema({
  nationality: {type: String},
  place_of_birth: {type: PlaceOfBirth},
  identity_document: {type: IdentityDocument},
  cpf_number: {type: String},
  passport_number: {type: String},
  birthdate: {type: DateOnly},
  gender: {type: String},
  marital_status: {type: String},
}, {_id: false});

const Address = new Schema({
  public_place: {type: String},
  number: {type: Number},
  complement: {type: String},
  neighborhood: {type: String},
  city: {type: String},
  state: {type: String},
  zip_code: {type: String},
}, {_id: false});

const FamilyMemberData = new Schema({
  name: {type: String},
  email: {type: String},
  phone: {type: String},
}, {_id: false});

const FamilyData = new Schema({
  father: {type: FamilyMemberData},
  mother: {type: FamilyMemberData},
}, {_id: false});

const InCaseOfEmergency = new Schema({
  responsible: {type: String},
  bond: {type: String},
  email: {type: String},
  phone: {type: String},
  alternative_phone: {type: String},
}, {_id: false});

const HighSchoolData = new Schema({
  school: {type: String},
  city: {type: String},
  state: {type: String},
  conclusion_year: {type: Number},
}, {_id: false});

const HigherEducationData = new Schema({
  institution: {type: String},
  course: {type: String},
  city: {type: String},
  state: {type: String},
  conclusion_year: {type: Number},
}, {_id: false});

const AcademicData = new Schema({
  high_school: {type: HighSchoolData},
  higher_education: {type: HigherEducationData},
}, {_id: false});

const IntendedCourse = new Schema({
  name: {type: String},
  institution: {type: ObjectId, ref: 'Institution'},
  preferred_shift: {type: String},
  alternative_shift: {type: String},
}, {_id: false});

const AdditionalInformation = new Schema({
  disabilities: {type: String},
  arrival_date: {type: DateOnly},
  how_did_you_know_the_company: {type: String},
}, {_id: false});

const Metadata = new Schema({
  messages_sent: {type: [String]},
}, {_id: false});

const Client = new Schema({
  company: {type: ObjectId, ref: 'Company', required: true, index: true},
  plan: {type: ObjectId, ref: 'Plan'},
  forename: {type: String, required: true},
  surname: {type: String, required: true},
  email: {type: String, required: true},
  phone: {type: String, required: true},
  photo_url: {type: String},
  needs_revision: {type: Boolean},
  registration_date: {type: Date, required: true},
  personal_data: {type: PersonalData},
  address: {type: Address},
  family_data: {type: FamilyData},
  in_case_of_emergency: {type: InCaseOfEmergency},
  academic_data: {type: AcademicData},
  intended_course: {type: IntendedCourse},
  additional_information: {type: AdditionalInformation},
  metadata: {type: Metadata},
}, {collection: 'clients'});
Client.virtual('payment_orders', {
  ref: 'PaymentOrder',
  localField: '_id',
  foreignField: 'client',
});
Client.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'client',
});

exports.Client = Client;
