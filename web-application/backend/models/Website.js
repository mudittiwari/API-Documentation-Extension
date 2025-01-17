const mongoose = require('mongoose');



const endpointSchema = new mongoose.Schema({
  url: { type: String, required: true },
  method: { type: String, required: true },
  headers: { type: Map, of: String, required: true },
  requestBody: { type: mongoose.Schema.Types.Mixed },
  response: { type: mongoose.Schema.Types.Mixed, required: true }, 
  params: {type: mongoose.Schema.Types.Mixed}
}, { timestamps: true });

const websiteSchema = new mongoose.Schema(
  {
    websiteName: {
      type: String,
      required: true,
      trim: true,
    },
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoints: {
      type: [endpointSchema],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Website', websiteSchema);
