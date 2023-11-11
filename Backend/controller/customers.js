const prisma = require("../model/index");
const { user } = require("../model/index");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendingMail } = require("../utils/mailing");
require("dotenv").config();
const jwt = require("jsonwebtoken");

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
    const id = req.userId;
    try {
      const customer = await prisma.user.findUnique({
        where: {
          id: id,
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
        where: { OR: [{ verifyToken: token }, { otp: +token }] },
      });
      if (!customer) {
        return res
          .status(404)
          .json({ error: "Invalid verification token or OTP" });
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
      if (!customer) {
        return res.status(410).json({ error: "Email doesn't exist" });
      }
      if (!customer.isVerified) {
        const newOtp = Math.floor(1000 + Math.random() * 9000);

        await user.update({
          where: { id: customer.id },
          data: { otp: newOtp },
        });
        const emailText = `Your new OTP is: ${newOtp}.`;
        await sendingMail({
          from: process.env.EMAIL,
          to: customer.email,
          subject: "New OTP for Verification",
          text: emailText,
        });
        return res
          .status(412)
          .json({ error: "User not verified. New OTP sent." });
      }
      const passwordMatch = await bcrypt.compare(password, customer.password);
      if (!passwordMatch) {
        return res.status(411).json({ error: "Invalid password" });
      }

      if (customer.role !== 'CUSTOMER') {
        res.status(403).json({ message: "Invalid user role" })

      }

      const token = jwt.sign({ id: customer.id, role: customer.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
      return res.status(201).json({ message: "Customer successfully logged in", token: token });
    } catch (error) {
      res.status(500).send(error);
      console.log(error);
    }
  },

  getExpoToken: async (req, res) => {
    const id = req.userId;
    const token = req.body.token;

    try {
      await user.update({
        where: {
          id: id,
        },
        data: {
          expoToken: token,
        },
      });
      res.status(201).json({ message: "Expo token successfully received!", token: token });
    } catch (error) {
      res.status(500).json({ message: "no Expo token" });
    }
  },
  checkNotification: async (req, res) => {
    const id = req.userId

    try {
      const { hasNotification } = await user.findUnique({
        where: {
          id: id
        }
      })
      res.status(200).send(hasNotification)

    } catch (error) {

      console.log(error)
      res.status(500).json({ message: 'Failed to retrieve notification status' })

    }

  },
  removeNotification: async (req, res) => {
    const id = req.userId

    try {
      const { hasNotification } = await user.update({
        where: {
          id: id
        },
        data: {
          hasNotification: false
        }
      })
      res.status(200).send(hasNotification)

    } catch (error) {

      console.log(error)
      res.status(500).json({ message: 'Failed to update notification status' })

    }

  },

};
