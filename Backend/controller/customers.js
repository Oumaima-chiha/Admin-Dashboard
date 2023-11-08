const prisma = require("../model/index");
const { user } = require("../model/index");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendingMail } = require("../utils/mailing");
require("dotenv").config();

module.exports = {
  getCustomers: async (req, res) => {
    try {
      const customers = await prisma.user.findMany();

      res.status(201).json(customers);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  },
  getOneCustomers: async (req, res) => {
    const id = req.params.id;
    try {
      const customer = await prisma.user.findUnique({
        where: {
          id: +id,
        },
      });

      res.status(201).json(customer);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  },

  createCustomers: async (req, res) => {
    const { fullname, email, password } = req.body;
    try {
      const checkemail = await user.findUnique({
        where: { email },
      });
      if (checkemail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const otp = Math.floor(1000 + Math.random() * 9000);
      const hashpassword = await bcrypt.hash(password, 10);
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const customer = await user.create({
        data: {
          fullname,
          email,
          password: hashpassword,
          role: "CUSTOMER",
          verifyToken,
          otp: otp,
        },
      });
      const emailText = `Your OTP is: ${otp}.`;

      await sendingMail({
        from: process.env.EMAIL,
        to: customer.email,
        subject: "Email Verification and OTP",
        text: emailText,
      });

      res.status(201).json({
        message:
          "customer registered successfully. Please check your email for verification instructions and OTP.",
      });
    } catch (error) {
      res.status(500).send(error);
      console.log(error);
    }
  },
  verifyEmail: async (req, res) => {
    const { token } = req.params;
    try {
      const customer = await user.findFirst({
        where: { OR: [{ verifyToken: token }, { otp: +token }] }
      });
      if (!customer) {
        return res.status(404).json({ error: "Invalid verification token or OTP" });
      }
      let updateData = {
        isVerified: true,
        verifyToken: null,
      };
      if (customer.otp) {
        updateData.otp = null;
      }
  
      await user.update({
        where: { id: customer.id },
        data: updateData,
      });
  
      res.status(200).json({
        message: "Email/OTP verified successfully. You can now log in.",
      });
    } catch (error) {
      res.status(500).send(error);
      console.log(error);
    }
  },

  customerSignin: async (req, res) => {
    const { email, password } = req.body;
    try {
      const customer = await user.findUnique({
        where: { email },
      });
      if (!customer)
        return res.status(410).json({ error: "Email doesn't exist" });
      const passwordMatch = await bcrypt.compare(password, customer.password);
      if (!passwordMatch)
        return res.status(411).json({ error: "unvalid password" });
      return res
        .status(201)
        .json({ meesage: "customer successfully logged in", customer });
    } catch (error) {
      res.status(500).send(error);
      console.log(error);
    }
  },

  getExpoToken: async (req, res) => {
    const id = req.params.id;
    const token = req.body.token;

    try {
      await user.update({
        where: {
          id: +id,
        },
        data: {
          expoToken: token,
        },
      });

      res
        .status(201)
        .json({ message: "Expo token successfully received!", token: token });
    } catch (error) {
      res.status(500).json({ message: "no Expo token" });
    }
  },
};
