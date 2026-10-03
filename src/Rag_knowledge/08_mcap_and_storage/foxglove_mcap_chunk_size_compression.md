---
source: "Foxglove MCAP & Rosbag2 Storage"
title: "Optimizing Recording Performance: MCAP Chunk Size, Buffer Depth, and Dropped Messages"
primary_fault_type: "Frequency_Drop"
primary_layer: "Storage_I_O"
primary_action_type: "Recovery_Adaptation"
---

# Optimizing Recording Performance: MCAP Chunk Size, Buffer Depth, and Dropped Messages

**Source:** Official ROS 2 Knowledge Base

---

Understanding MCAP chunk size and compression

Optimize your recording and playback performance

Author:

James Smith

July 30, 2024

Share this post

Data Management

MCAP

When recording MCAP data on your robot, you may have noticed some options for configuring “chunk size” and “compression”. If you use ROS 2 and record using

ros2 bag record

,

these can be set

using the

--storage-config-file

option. Many users don’t modify these, and that’s OK. However, correctly setting these options can make a big difference to performance on-robot and during playback.

MCAP can be written in two modes: directly appending messages to the file (“non-indexed”), or writing messages in chunks. The direct approach is the least compute-intensive, but is incompatible with key features such as indexing and compression. For efficient reading, non-indexed files usually need to be re-written into the chunked form using a tool such as

mcap compress

.

When writing in chunked mode, the MCAP data section is split into chunks. Each chunk contains a block of messages, (roughly) in the order they were received by the recorder. The block of message data can optionally be compressed using

Zstandard

or

LZ4

. This is controlled by your MCAP writer’s “compression” option.

When recording an MCAP file with chunks, an MCAP writer will store a batch of messages in memory until a size threshold is exceeded. This size threshold is called the “chunk size”. When that threshold is exceeded, the messages in memory will be written to disk as a new chunk.

Chunk Compression

Enabling chunk compression allows you to use less storage and reduce disk I/O at the cost of CPU and RAM. Recording compressed MCAP also reduces the bandwidth required to offload recordings, using your own tooling or with

Foxglove Agent

.

MCAP supports

Zstandard

and

LZ4

compression. Which to use depends on your compute and storage requirements. In our experience Zstandard provides the best compression ratios, but LZ4 offers greater (de)compression speed. Test both on your robot to be sure.

Chunk Size

A large chunk size (1 MB or more) gives your compression algorithm more data to work with, and can result in a better compression ratio for a given algorithm. However, the compression gains diminish as your chunk size increases. Also, since your messages are not committed to disk until the chunk size threshold is exceeded, the messages in memory will be lost if your writer crashes or loses power. If you need to keep data up to a few seconds before an interruption, then set your chunk size small enough that a new chunk gets written every few seconds.

Note: The rust MCAP writer library allows you to manually start a new chunk by calling a method on the writer. This allows you to implement your own chunking logic, and may be useful if you need to split chunks based on some other metric.

For further reading, check out the

MCAP design notes

.

Share this post
