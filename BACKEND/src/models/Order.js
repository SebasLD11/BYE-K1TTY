const { Schema, model } = require('mongoose');

const OrderSchema = new Schema(
{
items: [
{
productId: { type: Schema.Types.ObjectId, ref: 'Product' },
name: String,
price: Number,
qty: Number
}
],
total: Number,
status: { type: String, enum: ['pending', 'paid', 'canceled'], default: 'pending' },
stripeSessionId: String
},
{ timestamps: true }
);

module.exports = model('Order', OrderSchema);