import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return null;
    }

    const name =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email,
      },
    });

    return newUser;
  } catch (error) {
    if (error.code === "P2002") {
      return db.user.findUnique({
        where: { clerkUserId: user.id },
      });
    }

    console.error("Error syncing user:", error.message);
    return null;
  }
};
