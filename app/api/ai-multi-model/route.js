// import axios from "axios";
// import { NextResponse } from "next/server";
// export async function POST(req){

//     const {model,msg,parentModel}=await req.json();

// const response = await axios.post(
//   "https://kravixstudio.com/api/v1/chat",
//   {
//     message: msg,
//     aiModel: model,
//     outputType: "text"
//   },
//   {
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": "Bearer "+process.env.KARVIXSTUDIO_API_KEY
//     }
//   }
// );

// console.log(response.data);
// return NextResponse.json({
//     ...response.data,
//     model:parentModel
// })
// }
import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { model, msg, parentModel } = await req.json();

    const response = await axios.post(
      "https://kravixstudio.com/api/v1/chat",
      {
        message: msg,
        aiModel: model,
        outputType: "text",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.KARVIXSTUDIO_API_KEY,
        },
      }
    );

    console.log("✅ API Response:", response.data);

    return NextResponse.json({
      ...response.data,
      model: parentModel,
    });
  } catch (error) {
    console.error("❌ Error calling API:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
