await col.updateOne(
  { _id: id },
  {
    $set: {
      status: "rejected",
      adminNote: reason,
      rejectedAt: new Date(),
    },
  }
);
