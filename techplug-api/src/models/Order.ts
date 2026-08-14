import { Schema, model } from "mongoose";

// The store only accepts M-Pesa Till Number payments. "mpesa"/"cod"/"card" remain valid
// values for historical orders placed before this changed — the schema just no longer
// accepts them going forward.
export type PaymentMethod = "till" | "mpesa" | "cod" | "card";
export const CURRENT_PAYMENT_METHOD: PaymentMethod = "till";

export const ORDER_STATUSES = ["placed", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Tracks the money, separate from `status` (which tracks fulfillment) — an order can be
// "placed" (fulfillment) while payment is still "pending" mid-STK-push.
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  color: string;
  // Which variant (e.g. { RAM: "16GB", Storage: "512GB" }) was selected, if the product has
  // priced variants — absent for products without variants. `price` above is always the
  // server-resolved price for this exact combination (see routes/orders.ts), never trusted
  // from the client.
  variantOptions?: Record<string, string>;
  quantity: number;
  image: string;
}

export interface OrderContact {
  name: string;
  phone: string;
  email: string;
  address: string;
  town: string;
  notes?: string;
}

export interface OrderDocument {
  firebaseUid?: string;
  orderNumber: string;
  items: OrderItem[];
  contact: OrderContact;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  mpesaCheckoutRequestId?: string;
  // Random per-order token embedded in the CallBackURL sent to Safaricom for this order's STK
  // push, never returned to the client. The callback handler (routes/payments.ts) checks it
  // against the URL it receives, so a client that only knows the (client-visible)
  // mpesaCheckoutRequestId can't forge a "payment successful" callback for their own order.
  mpesaCallbackSecret?: string;
  mpesaReceiptNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    // Not `required` — Product.colors is optional (default []), so a product with no
    // colors legitimately reaches checkout with color: "". Mongoose's `required` check
    // on a String rejects "" as if it were unset, so this must stay optional to match
    // real catalog data instead of hard-rejecting every colorless product's orders.
    color: { type: String, default: "" },
    variantOptions: { type: Schema.Types.Mixed },
    quantity: { type: Number, required: true },
    image: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDocument>(
  {
    firebaseUid: { type: String, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    items: { type: [orderItemSchema], required: true },
    contact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
      town: { type: String, required: true },
      notes: { type: String },
    },
    paymentMethod: { type: String, enum: ["till", "mpesa", "cod", "card"], required: true, index: true },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "placed", index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid", index: true },
    mpesaCheckoutRequestId: { type: String, index: true },
    mpesaCallbackSecret: { type: String },
    mpesaReceiptNumber: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// The admin order list (routes/orders.ts) sorts by createdAt on every request.
orderSchema.index({ createdAt: -1 });

export const Order = model<OrderDocument>("Order", orderSchema);
