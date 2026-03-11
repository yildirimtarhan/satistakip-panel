const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {  // ← BU ALAN EKSİK
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  seq: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index oluştur (performans için)
counterSchema.index({ key: 1, companyId: 1, year: 1, month: 1 }, { unique: true });

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

module.exports = Counter;