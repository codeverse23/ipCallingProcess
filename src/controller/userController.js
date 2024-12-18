const { sendOtp } = require("../helper/email");
const { genJwt } = require("../helper/genrateJwt.js");
const { jwtToken } = require("../helper/jwt");
const group = require("../model/group.js");
const privacyPolicy = require("../model/privacyPolicy");
const termCondition = require("../model/termCondition.js");
const user = require("../model/user");
const moment = require("moment/moment.js");

module.exports.signUp = async (req, res) => {
  try {
    const { name, username, email, mobile, password } = req.body;

    var otp = Math.floor(1000 + Math.random() * 9000);
    // Find user by email
    const findUser = await user.findOne({ email: email });
    if (findUser) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "This Email Is Already Exist",
      });
    }

    // Check if username is already taken
    const findUserName = await user.findOne({ username: username });
    if (findUserName) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Username is already taken Please try another username",
      });
    }
    const userObj = { name, username, email, mobile, password, otp };

    let data = await user.create(userObj);
    sendOtp(email, otp, name);
    return res.json({
      statusCode: 200,
      status: true,
      message: "User Create Successfully",
      data: data,
    });
  } catch (err) {
    return res.json({
      statusCode: 400,
      status: false,
      message: err.message,
    });
  }
};

module.exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (username.length < 4) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Username must be at least 4 characters long",
      });
    }

    // Check if username is already taken
    const findUser = await user.findOne({ username: username });
    if (findUser) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Username is already taken Please try another username",
      });
    }

    return res.json({
      statusCode: 200,
      status: true,
      message: "Username is available",
    });
  } catch (err) {
    return res.json({
      statusCode: 500,
      status: false,
      message: err.message,
    });
  }
};

module.exports.updateUsername = async (req, res) => {
  try {
    const { userId, username } = req.body;

    // Check if username is at least 4 characters long
    if (username.length < 4) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Username must be at least 4 characters long",
      });
    }

    // Find user by userId
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "User not found",
      });
    }

    // Check if the new username is already taken by another user
    const usernameExists = await user.findOne({ username: username });
    if (usernameExists) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Username is already taken",
      });
    }

    // Update the user's username
    let updateUser = await user.updateOne(
      { _id: userId },
      { $set: { username: username } }
    );

    return res.json({
      statusCode: 200,
      status: true,
      message: "Username is updated successfully",
      data: updateUser,
    });
  } catch (err) {
    return res.json({
      statusCode: 500,
      status: false,
      message: err.message,
    });
  }
};

module.exports.varifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const findUser = await user.findOne({ email: email });
    if (!findUser) {
      return res.json({
        status: true,
        message: "User Not Found",
        data: "",
      });
    }
    if (findUser.otp !== otp) {
      return res.json({
        status: false,
        statusCode: 400,
        message: "please provide currect otp",
      });
    }

    await user.findOneAndUpdate(
      { _id: findUser._id },
      { $set: { isVerified: true } }
    );
    const role = findUser.role;
    return res.json({
      status: true,
      statusCode: 200,
      message: "User Varify Successfully",
      role: role,
    });
  } catch (err) {
    return res.json({
      status: true,
      message: "Internal Server Error",
      data: err.message,
    });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const findAdmin = await user.findOne({ email: email });
    if (!findAdmin) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Admin Not Found",
      });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = password === findAdmin.password;
    if (!isMatch) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Please Enter the correct password",
      });
    }

    const role = findAdmin.role;
    const id = findAdmin._id;
    // Generate JWT token
    const token = jwtToken(email, password, role); // Replace with your actual token generation logic

    // Update the lastActive and mark the user as active
    await user.findOneAndUpdate(
      { email: email },
      {
        lastActive: new Date(), // Set lastActive to current time
        status: "active", // Mark user as active
      }
    );

    return res.json({
      statusCode: 200,
      status: true,
      message: "Login Successfully",
      data: token,
      role: role,
      id,
    });
  } catch (err) {
    return res.json({
      statusCode: 400,
      status: false,
      message: err.message,
    });
  }
};

module.exports.genrateToken = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find admin by email
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "User Not Found",
      });
    }

    // // Compare the provided password with the hashed password in the database
    // const isMatch = password === findUser.password;
    // if (!isMatch) {
    //   return res.json({
    //     statusCode: 400,
    //     status: false,
    //     message: "Please Enter the correct password",
    //   });
    // }

    const role = findUser.role;
    // Generate JWT token
    const token = genJwt(userId, role); // Replace with your actual token generation logic

    // Update the lastActive and mark the user as active
    await user.findOneAndUpdate(
      { _id: userId },
      {
        lastActive: new Date(), // Set lastActive to current time
        status: "active", // Mark user as active
      }
    );

    return res.json({
      statusCode: 200,
      status: true,
      message: "token genrate  Successfully",
      data: token,
      role:role
    });
  } catch (err) {
    return res.json({
      statusCode: 400,
      status: false,
      message: err.message,
    });
  }
};

module.exports.changPassword = async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    const findUser = await user.findOne({ _id: userId });

    if (!findUser) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "User does not exist",
      });
    }

    if (findUser.password !== oldPassword) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Invalid old password",
      });
    }

    const result = await user.updateOne(
      { _id: userId },
      { $set: { password: newPassword } }
    );

    if (result.modifiedCount === 0) {
      return res.json({
        statusCode: 400,
        status: false,
        message: "Failed to update password",
      });
    }

    return res.json({
      statusCode: 200,
      status: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    return res.json({
      statusCode: 400,
      status: false,
      message: err.message,
    });
  }
};

module.exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    console.log(userId); // Log the userId for debugging purposes

    const findUser = await user.findOne(
      { _id: userId }, // Searching by userId
      { name: 1, email: 1, image: 1, username: 1 } // Only return selected fields
    );

    if (!findUser) {
      return res.status(400).json({
        status: false,
        message: "User does not exist",
      });
    }

    // If the user's image is empty, provide a default image URL
    if (findUser.image === "") {
      findUser.image = "https://cell121.s3.eu-north-1.amazonaws.com/groupImage/groupImage_1730968991481_Screenshot%20%28101%29.png";
    }

    // Return the user profile data
    return res.status(200).json({
      status: true,
      message: "User Profile shown successfully",
      data: findUser,
    });

  } catch (err) {
    return res.status(400).json({
      status: false,
      message: err.message,
    });
  }
};

module.exports.updateProfileImage = async (req, res) => {
  try {
    const { userId} = req.body;
    const image = req.file.location;

    // Find the group by adminId
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        status: false,
        statusCode: 400,
        message: "User Not Found",
      });
    }
     const updateInfo = await user.updateOne({_id:userId},{$set:{image:image}})
     const data =await user.findOne({_id:userId},{image:1})
    return res.json({
      status: true,
      statusCode: 200,
      message: "Profile Image Update successfully",
      data:data
    });
  } catch (error) {
    return res.json({
      statusCode: 500,
      status: false,
      message: error.message,
    });
  }
};

module.exports.changEmail = async (req, res) => {
  try {
    const { userId, oldEmail, newEmail } = req.body;

    // Find the group by adminId
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        status: false,
        statusCode: 400,
        message: "User Not Found",
      });
    }
    if(findUser.email!==oldEmail){
      return res.json({
        status: false,
        statusCode: 400,
        message: "You enter the wrong email",
      });
    }
    const findNewEmail =await user.findOne({email:newEmail});
    if (findNewEmail){
      return res.json({
        status: false,
        statusCode: 400,
        message: "this Email already in use please use anather email",
      });
    }
    const updateEmail =await user.updateOne({_id:userId},{$set:{email:newEmail}})
    return res.json({
      status: true,
      statusCode: 200,
      message: "Email update successfully",
      data: updateEmail,
    });
  } catch (error) {
    return res.json({
      statusCode: 500,
      status: false,
      message: error.message,
    });
  }
};

module.exports.forgotPasswordSendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    var otp = Math.floor(1000 + Math.random() * 9000);
    const findUser = await user.findOne({ email: email });

    if (!findUser) {
      return res.json({
        status: false,
        statusCode: 400,
        message: "User Not Found",
        data: "",
      });
    }
    const name = findUser.name;
    const role = findUser.role;
    sendOtp(email, otp, name);
    await user.findOneAndUpdate({ _id: findUser._id }, { $set: { otp: otp } });
    return res.json({
      status: true,
      statusCode: 200,
      message: "mail send successfully",
      otp: otp,
      role: role,
    });
  } catch (err) {
    return res.json({
      status: true,
      message: "Internal Server Error",
      data: err.message,
    });
  }
};

module.exports.forgotChangePassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await user.findOne({ email: email });
    if (!findUser) {
      return res.json({
        status: true,
        message: "User Not Found",
        data: "",
      });
    }

    const role = findUser.role;
    await user.findOneAndUpdate(
      { _id: findUser._id },
      { $set: { password: password } }
    );
    return res.json({
      status: true,
      statusCode: 200,
      message: "Password Change Successfully ",
      role: role,
    });
  } catch (err) {
    return res.json({
      status: true,
      message: "Internal Server Error",
      data: err.message,
    });
  }
};

module.exports.privacyPolicyList = async (req, res) => {
  try {
    const { userId } = req.body;
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        statusCode: 400,
        status: true,
        message: "user not found",
      });
    }
    const data = await privacyPolicy.find();
    return res.json({
      statusCode: 200,
      status: true,
      message: "Privacy policy show successfully",
      data: data,
    });
  } catch (err) {
    return res.json({
      statusCode: 400,
      status: false,
      message: err.message,
    });
  }
};

module.exports.termConditionList = async (req, res) => {
  try {
    const { userId } = req.body;
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        statusCode: 400,
        status: true,
        message: "user not found",
      });
    }
    const data = await termCondition.find();
    return res.json({
      statusCode: 200,
      status: true,
      message: "Term ConditionList List show successfully",
      data: data,
    });
  } catch (err) {
    return res.json({
      statusCode: 400,
      status: false,
      message: err.message,
    });
  }
};

module.exports.userList = async (req, res) => {
  try {
    const userId = req.query.userId;
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        status: false,
        message: "User Not Found",
        data: "",
      });
    }
    const list = await user.find(
      { role: "USER", isDeleted: false },
      { password: 0, __v: 0, role: 0, isVerified: 0, otp: 0 }
    );
    return res.json({
      status: true,
      statusCode: 200,
      message: "User List Shown Successfully",
      data: list,
    });
  } catch (err) {
    return res.json({
      status: true,
      message: "Internal Server Error",
      data: err.message,
    });
  }
};

module.exports.privecyInfo = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the group by adminId
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        status: false,
        statusCode: 400,
        message: "Admin Not Found",
      });
    }
    return res.json({
      status: true,
      statusCode: 200,
      lastSeen:findUser.lastSeen,
      profilePhoto:findUser.profilePhoto,
      message: "PrivecyInfo Show Successfully",
    });
  
    
  } catch (error) {
    return res.json({
      statusCode: 500,
      status: false,
      message: error.message,
    });
  }
};

module.exports.updatePrivecyInfo = async (req, res) => {
  try {
    const { userId,lastSeen,profilePhoto  } = req.body;

    // Find the group by adminId
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        status: false,
        statusCode: 400,
        message: "User Not Found",
      });
    }
    const updateObj={};
    if (lastSeen) {updateObj.lastSeen=lastSeen} 
    if (profilePhoto){updateObj.profilePhoto=profilePhoto}
    const updateInfo = await user.updateOne({_id:userId},{$set:updateObj})
    return res.json({
      status: true,
      statusCode: 200,
      message: "Privacy Info Update successfully",
      data:updateInfo
    });
  } catch (error) {
    return res.json({
      statusCode: 500,
      status: false,
      message: error.message,
    });
  }
};

module.exports.userGroupList = async (req, res) => {
  try {
    const userId = req.query.userId;

    // Find user by userId (optional validation)
    const findUser = await user.findOne({ _id: userId });
    if (!findUser) {
      return res.json({
        status: false,
        statusCode: 400,
        message: "User Not Found",
      });
    }

    // Find groups where the user is part of the members array
    const findGroup = await group.find({ members: userId }, { groupName: 1, lastMessage: 1, lastMessageTime: 1 });

    if (findGroup.length === 0) {
      return res.json({
        status: false,
        statusCode: 404,
        message: "No Groups Found for this User",
      });
    }

    // Format the lastMessageTime
    const formattedGroups = findGroup.map(group => {
      const formattedTime = moment(group.lastMessageTime).format("hh:mm:A");
      return {
        ...group.toObject(),
        lastMessageTime: formattedTime,
      };
    });

    // Return the formatted groups
    return res.json({
      status: true,
      statusCode: 200,
      message: "Group List Show Successfully",
      data: formattedGroups,
    });
  } catch (error) {
    return res.json({
      statusCode: 400,
      status: false,
      message: error.message,
    });
  }
};
