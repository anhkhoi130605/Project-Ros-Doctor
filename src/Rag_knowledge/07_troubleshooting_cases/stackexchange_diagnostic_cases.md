---
source: "StackExchange ROS 2 Accepted Solutions"
title: "Real-World ROS 2 Troubleshooting Cases & Verified Solutions"
primary_fault_type: "Message_Dropout"
primary_layer: "ROS2_DDS_Middleware"
primary_action_type: "Recovery_Adaptation"
---

# Real-World ROS 2 Troubleshooting Cases & Verified Solutions

Strictly filtered cases with accepted answers targeting Topic Dropout, Frequency Drop, Timestamp Drift, and TF Tree Broken.

## Case 1: How to use transformPose in Python with Time(0) (most recent common time)?
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

- **Target Fault Domain:** `TF Tree Broken / Timestamp Lag`
- **Tags:** `ros, tf2, transform`
- **Community Score:** 0 votes
- **Original Thread:** How to use transformPose in Python with Time(0) (most recent common time)?

### Symptom & Problem:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

I want to use TF to transform a PoseStamped into a frame, perform some operations, and then transform it back to its original frame. The frame is not published to TF, so I set it as a TransformStamped in the TfListener:
m = geometry_msgs.msg.TransformStamped
m.header.frame_id = surface_origin.header.frame_id
m.header.stamp = rospy.Time.now-rospy.Duration(0.1)
m.child_frame_id = "tmp_frame__"
m.transform.translation.x = surface_origin.pose.position.x
m.transform.translation.y = surface_origin.pose.position.y
m.transform.translation.z = surface_origin.pose.position.z
m.transform.rotation.x = surface_origin.pose.orientation.x
m.transform.rotation.y = surface_origin.pose.orientation.y
m.transform.rotation.z = surface_origin.pose.orientation.z
m.transform.rotation.w = surface_origin.pose.orientation.w
tf_listener.setTransform(m)

in_pose_in_tmp_frame = tf_listener.transformPose("tmp_frame__", in_pose)
# [...] Do operations here
new_pose_in_original_frame = tf_listener.transformPose(in_pose.header.frame_id, in_pose)
Sadly, I get an ExtrapolationException on the second transformPose because the operations take too long:
tf2.ExtrapolationException: Lookup would require extrapolation at time 1617082915.398905516, but only time 1617082913.271360636 is in the buffe, when looking up transform from frame [tmp_frame__] to frame [surface_frame]
I tried adding rospy.Time(0), since
"Time(0) gives you the latest common time"
. However, it looks
the Python API doesn't offer that
. Looking at
the source code
seems to confirm this.
I cannot find documentation for the TF2 Python API.  The
TF Python documentation
is only generated up until Melodic(?), so the
link in the wiki
is broken. The
TF2 source code
is not human-readable unless you know how Python bindings are generated from C++.
I also tried using
setTransform
again before the second
transformPose
call, to update the transform, but then TF complains about extrapolation into the negative future, which is excessively strange:
tf2.ExtrapolationException: Lookup would require extrapolation -0.099048138s into the future.  Requested time 1617083034.013916254 but the latest data is at time 1617083033.914868116, when looking up transform from frame [tmp_frame__] to frame [surface_frame]
I know I should port to TF2, but I didn't have a pressing reason yet. I only need to use the TF tree here, no extrapolation or time lookup. Is there a "please don't bother me about time" setting in Python? Where is the TF2 Python documentation? How else could I solve this issue without much hassle?
edit:
The tf2 Python API
is the C++ documentation
, and the tf2_ros API is available
here
and
here
for Melodic. It
looks like this is not as visible as it should be
, but I'm not sure what to do about that.
The extrapolation error about a lookup at
-0.099s into the future
(although a negative time in the future should be in the past) might be because I did not set the
seq
of the header.
Originally posted
by
fvd
on ROS Answers with karma: 2180 on 2021-03-30
Post score: 1

### Verified Solution & Technical Diagnosis:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

Using a time of zero works in python. It's in the
tf python listener tutorial
There's a known issue with the
epydoc based documentation in noetic
. However since this package is deprecated there's been no API changes since melodic and you can use that documentation. It's actually barely changed for years before that too. You can just use the
melodic documentation that you already linked to
.
However it's not necessarily going to solve your problem because it still needs a "common" time. Aka for all links in the chain it need information at a "common" time aka the same time. tf does interpolation between different samples in time.
The simple solution is that you need to make sure that you have data in your listener from before and after the requested timestamp for all links in the chain. If you use TIme(0) you only have to make sure that you have any timepoint that's consistent and it will return the latest.
And although you don't want to move to tf2 in tf2 we added
static transform support
which does exactly what you want letting you not worry about time for a link because a static transform is considered to be valid for all times. So if that's what you want, you may actually want to look at moving forward to tf2.
PS As a side note your question makes a lot more assertions than asking for help and a lot of those assertions are inaccurate which means that you end up digging further afield. You may find that being a little more thorough in each step of your investigation may help you get what you want faster.
Originally posted by
tfoote
with karma: 58457 on 2021-03-30
This answer was
ACCEPTED
on the original site
Post score: 2
Original comments
Comment by
fvd
on 2021-03-30
:
Thanks for the quick response, it's appreciated. I apologize if my tone sounded off – I wanted to document how I arrived where I was and might have relived a bit too much of the debugging frustration while collecting my breadcrumbs. Take it as a user story. My wording at the end was misleading by the way: I don't mind porting to TF2 at all, but I couldn't find Python-specific documentation, so I couldn't tell if upgrading would solve the problem. I updated the post to clarify and added links.
I have some questions though:
In the tutorial, Time(0) is passed to lookupTransform, but not to transformPose. Can you confirm that transformPose does not accept Time in TF1, or if I am missing something?
I added an explanation about the extrapolation error. Do you consider this a bug worth reporting, or a user error to document in a separate question?
transformPose is the most convenient interface in my eyes, but it seems like an afterthought in the tutorial. Shall I add it?
Comment by
tfoote
on 2021-03-30
:\
If you set the time to zero inside the trasnsformPose it will call lookupTransform with the timestamp from the input Pose which will then propagate back out in the resultant pose.
There are several corner cases in the future/past and this may be a case where we didn't conditionally change the print string. I haven't been in this code base in a while but if I remember correctly there may be issues when you have two or three links and potentially different levels of time continuity where there's no complete solution at any given time but some earlier history for some frames and some newer history for other frames. And thus some frames are in the future and some in the past. And in that case neither future nor past is correct, and I don't know a word for it.
Adding transformPose would be a great addition to the tutorials. It's definitely the most convenient and the one designed to be the primary interface. The core tutorials were mostly written to teach the concepts, not the api
Comment by
fvd
on 2021-04-05
:
I updated the tutorials with deprecation badges on each page and added a transformPose/transform example to the tf and tf2 listener tutorials, but I can't get either transformPose with Time(0), or the tf2 transform examples to work. If you can fix the problems in
this PR
I'll commit to updating the tutorial pages accordingly.
Comment by
fvd
on 2021-04-30
:
Could you add the syntax to use
Time(0)
with
transformPose
in Python?
Comment by
tfoote
on 2021-07-06
:
Set the timestamp of the pose to Time(0)
my_pose_stamped.header.stamp = rospy.Time(0)
... fill in the rest of the fields
And then
transformPose('target_frame', my_pose_stamped)

---

## Case 2: ROS2 lookupTransform - cannot get transform at time now
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

- **Target Fault Domain:** `TF Tree Broken / Timestamp Lag`
- **Tags:** `ros, ros2, rclcpp, tf2, transform`
- **Community Score:** 0 votes
- **Original Thread:** ROS2 lookupTransform - cannot get transform at time now

### Symptom & Problem:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

I am having issues acquiring transformation at the required time using
lookupTransform
It works as expected when I use
tf2::TimePointZero
(i.e. the last transform) but is failing when I use
this->get_clock->now
(i.e. transformation at "now").
Code snippet:
transformStamped = tf_buffer_->lookupTransform(
    toFrameRel, fromFrameRel,
    this->get_clock->now,
    50ms);
The exception I handle is as follows:
Lookup would require extrapolation into the future.  Requested time 1629833266.557150 but the latest data is at time 0.000000, when looking up transform from frame [turtle1] to frame [turtle2]
I actually spawn the turtle2 and definitely it needs some time to broadcast its transform, but the error is always there.
Full code is available here:

It also seems strange to me that the
the latest data is at time 0.000000
is never changing.
Please let me know if you have any ideas.
Originally posted
by
kurshakuz
on ROS Answers with karma: 76 on 2021-08-24
Post score: 0

### Verified Solution & Technical Diagnosis:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

Your problem isn't in the subscriber but the broadcaster where you're publishing the transforms with time zero.

You create the time object called "now" but you don't set the value to now, you just leave it default initialized which is time zero.
Originally posted by
tfoote
with karma: 58457 on 2021-08-24
This answer was
ACCEPTED
on the original site
Post score: 1
Original comments
Comment by
kurshakuz
on 2021-08-24
:
Thanks a lot! That makes it clear. Should I simply assign the now variable to this->get_clock->now?
Comment by
tfoote
on 2021-08-24
:
I expect that's what you want to do if you want that variable to represent the current time when publishing.
Comment by
kurshakuz
on 2021-08-27
:
Can I ask you a similar question, but based on Python? What I am trying to do is to acquire transform at time now and change the variable at

to
now = self.get_clock.now
. But I always get the
Could not transform turtle1 to turtle2: Lookup would require extrapolation into the future.
error even when I pass the timeout parameter using different values (from 0.05 to 5.0 seconds). Do you have any clue why is that may happen?
The call is as below:
now = self.get_clock.now
                    trans = self.tf_buffer.lookup_transform(
                        to_frame_rel,
                        from_frame_rel,
                        now,
                        timeout=Duration(seconds=1.0))
Comment by
tfoote
on 2021-08-27
:
Please ask a new question with enough information to reproduce your problem. If you can make a reduced test case that can show the problem it's easiest to help you. Also look for other similar questions on this forum first. This type of question has been asked many times.
Comment by
kurshakuz
on 2021-08-30
:
Do you mind to take a look at

? I added additional explanations there.

---

## Case 3: rviz2 requests data ahead of system clock -&gt; requires extrapolation into the future
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

- **Target Fault Domain:** `TF Tree Broken / Timestamp Lag`
- **Tags:** `ros, ros2, transform, tf2`
- **Community Score:** 0 votes
- **Original Thread:** rviz2 requests data ahead of system clock -&gt; requires extrapolation into the future

### Symptom & Problem:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

Hello everyone,
I'm trying to visualize LaserScan data from the map frame and I get the 'requires extrapolation into the future'-error. However,
the requested time is actually ahead of the system clock
(always almost precisely 71 seconds). The transformation map->odom->base_link->laser_frame seems to work, since the full tree is shown in the tf2 plugin in rviz2 and the LaserScan data can be visualized, when the fixed frame in rviz is set to base_link or laser_frame.
Rviz Error, (the requested time is
ahead
of the system time, while the "latest data" is spot on the system time):
[ERROR] [1626000928.858451390] [rviz2]: Lookup would require extrapolation into the future.  Requested time 1626000999.830946 but the latest data is at time 1626000928.843655, when looking up transform from frame [laser_frame] to frame [map]
My own written node publishes the LaserScan and the header's stamp corresponds to the system time
The base_link->laser_frame transformation is published by the robot_state_publisher
The odom->base_link transformation is published by the ekf_node from robot_localization. I tried publishing it directly from my
Odometry node, but nothing changed.
For now, the map->odom transformation is a static_transform_publisher
When running tf2_monitor I get these results:
RESULTS: for all Frames

Frames:
Frame: base_link, published by <no authority available>, Average Delay: 0.00016122, Max Delay: 0.00232911
Frame: laser_frame, published by <no authority available>, Average Delay: 0.000118047, Max Delay: 0.00148201
Frame: odom, published by <no authority available>, Average Delay: 82.28, Max Delay: 82.28

All Broadcasters:
Node: <no authority available> 100.011 Hz, Average Delay: 0.000142455 Max Delay: 0.00232911
Has anybody an idea? What can I do, to further debug this problem? I've spent a few days on this problem and I'm absolutely clueless by now, this prevents me also from using Nav2 further down the line...
I'm using Ros2 Foxy and all nodes are running on one machine (Ubuntu 20.04)
Originally posted
by
Lukarios
on ROS Answers with karma: 3 on 2021-07-11
Post score: 0

### Verified Solution & Technical Diagnosis:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

71 seconds is a very large offset. My initial thought is that you're on a different computer with an offset clock.
As you say the tree looks fine and can be rendered and viewed and appears to be approximately system time then the problem is likely the incoming data has a timestamp in the future.
A consistent large offset like that implies that there's like a different time source instead of a potential small latency due to transmission delays etc. The requested transform time comes from the timestamp of the incoming data. As such you should look at the timestamp of the incoming laser scan. And then trace back to what is generating that timestamp and what time source it's using.
Originally posted by
tfoote
with karma: 58457 on 2021-07-12
This answer was
ACCEPTED
on the original site
Post score: 1
Original comments
Comment by
Lukarios
on 2021-07-12
:
First of all, thank you for your answer, I did not now that the requested timestamp is from the incoming laser scan.
I agree, that this is a systematic error and not just "lag"
I checked and the LaserScan stamp is correct, meaning synchronized to the system clock, but this got me thinking about the LaserScan data.
I set the scan_time and time_increment to 0.2 seconds (for reason I cannot remember) When leaving these undefined everything works!
Sorry, that this was just a mistake like this. I wouldn't have opened a question, if I hadn't spent days on it myself...
Your answer lead me to the right way, thank you very much!
Comment by
tfoote
on 2021-07-12
:
No problem, glad that you found the issue following the above. Please use the checkmark on the left of my answer to mark it as resolved so other's know that you've found your answer.
Yeah a time_increment of 0.2 is very large. That should be the interbeam time increment which is typically orders of magnitude lower. And scan_time should be the inverse of the scan frequency so you can know when to expect the next data.

---

## Case 4: TF2 - static_transform_publisher - Extrapolation into the future
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

- **Target Fault Domain:** `TF Tree Broken / Timestamp Lag`
- **Tags:** `ros, moveit, tf2, planning-scene, static-transform-publisher`
- **Community Score:** 0 votes
- **Original Thread:** TF2 - static_transform_publisher - Extrapolation into the future

### Symptom & Problem:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

Hello,
I have a couple of static_transform_publishers from the TF2 package running. How is it possible that a node complains about extrapolating into the future, when it tries to lookup a transformation from a random element to the static one? In my
understanding
, the static-transforms should be valid for all eternity, so why would you complain about timing issues?
A further explanation about my setup:
I have 2 Kinects and I am using those in my moveIt setup to create the Octomap.
As explained
here
, moveIt complains about extrapolation into the future while looking up a transform from my robot to the cameras.
My first solution was to write a python node, which would handle all the publishing instead of seperate static_transform_publishers from the old TF. There, I could date the transformations back in time to avoid those issues.
Now I read about the static transforms in TF2 and implemented all the camera transformations like this:
<node pkg="tf2_ros" type="static_transform_publisher" name="camera_top_base_link_1" args="0 -0.045 0 0 0 0 1 /camera_top/camera_top_link camera_top/camera_top_rgb_frame  " />
Still, moveIt is complaining
[ERROR] [1411130239.665581579]: Transform error: Lookup would require extrapolation into the future.  Requested time 1411130239.663295803 but the latest data is at time 1411130239.541714906, when looking up transform from frame [finger_2_link_0] to frame [camera_top/camera_top_depth_optical_frame]
[ERROR] [1411130239.997648183]: Transform cache was not updated. Self-filtering may fail
But running ``rosrun tf tf_echo /finger_2_link_0 camera_top/camera_top_depth_optical_frame` has no problems and tells me the transforms moveIt couldn't find?
Thanks in advance,
Rabe
Originally posted
by
Rabe
on ROS Answers with karma: 683 on 2014-09-19
Post score: 0
Original comments
Comment by
Mani
on 2014-09-19
:
Have you tried reducing
static_transform_publisher
's publishing frequency from the current rate (1000Hz)? I would suggest that you decrease that frequency to 10Hz or even 1Hz.
Comment by
Rabe
on 2014-09-19
:
Why is there a rate at all? My understandin was that it was "static" as in "published once"? Anyway, I can't even set the rate in the current way it is implemented, see the file
here
Comment by
Rabe
on 2014-09-19
:
I also tried various rates with the old implementation of tf, which didn't change anything either
Comment by
Mani
on 2014-09-19
:
@Rabe Sorry, I made a mistake when reading your
static_transform_publisher
command.

### Verified Solution & Technical Diagnosis:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

I suspect static transform isn't the problem here.
The problem here is that MoveIt is requesting a very recent transform, and your system hasn't published that transform yet. Note that the time differential here is pretty small, about 0.12 seconds, so it's most likely just a processing delay somewhere in your system.
I would start by running
rosrun tf tf_monitor
to inspect the transform delays in your system, and then follow up by looking through the
tf Troubleshooting guide
Originally posted by
ahendrix
with karma: 47576 on 2014-09-19
This answer was
ACCEPTED
on the original site
Post score: 3

---

## Case 5: Hydro move_base/tf2 extrapolation error into the future errror
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

- **Target Fault Domain:** `TF Tree Broken / Timestamp Lag`
- **Tags:** `navigation, ros-hydro, tf2, local-planner, global-planner`
- **Community Score:** 0 votes
- **Original Thread:** Hydro move_base/tf2 extrapolation error into the future errror

### Symptom & Problem:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

Hi All,
We are using Hyrdo's move_base and we continue to get an extrapolation error into the future. I believe this is causing our robot to stop and start during a traverse.
In looking the ROS source code it appears that the lookupTransform in navigation/base_local_planner/src/goal_functions.cpp line 110 in transformGlobalPlan is returning the error. We are using the dwa_local_planner. We are publishing transforms at 20hz from a separate node. The parameters to tf.lookupTransform are  global_frame = "local" and the plan_pose.header.frame_id = "global", and the plan_pose.header.stamp comes from the generating the gloabl plan. I think the bug is coming from tf2/src/buffer_core.cpp in WalkToTopParent. I still need to do more debugging to find the exact problem. I've turned the debug information on for move_base so I'm including a snippet of it, and the console log below. Any help would be appreciated.
Thanks.
[DEBUG] [1386166204.375994679]: The action server has received a new goal request
[DEBUG] [1386166204.376260355]: A new goal has been recieved by the single goal action server
[DEBUG] [1386166204.376656845]: Accepting a new goal
[DEBUG] [1386166204.376895493]: Accepting goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.377491239]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.377705512]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166204.378025665]: Planning...
[DEBUG] [1386166204.378168840]: Waiting for plan, in the planning state.
[DEBUG] [1386166204.378332478]: Full control cycle time: 0.000979315

[DEBUG] [1386166204.455307564]: Got Plan with 49 points!
[DEBUG] [1386166204.457263957]: Generated a plan from the base_global_planner
[DEBUG] [1386166204.458307175]: Planner thread is suspending
[DEBUG] [1386166204.477544259]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.477708316]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166204.477914069]: Got a new plan...swap pointers
[DEBUG] [1386166204.478065066]: pointers swapped!
[ INFO] [1386166204.478229751]: Got new plan
[DEBUG] [1386166204.478925371]: In controlling state.
[DEBUG] [1386166204.515009849]: Got a valid command from the local planner: 0.500, 0.000, 2.000
[DEBUG] [1386166204.516475469]: Full control cycle time: 0.037907056

[DEBUG] [1386166204.578542367]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.579298889]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166204.580845315]: In controlling state.
[DEBUG] [1386166204.609181880]: Got a valid command from the local planner: 0.500, 0.000, 2.000
[DEBUG] [1386166204.610400540]: Full control cycle time: 0.031062960

[DEBUG] [1386166204.677557610]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.677725508]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166204.677947673]: In controlling state.
[DEBUG] [1386166204.704567051]: Got a valid command from the local planner: 0.500, 0.000, 2.000
[DEBUG] [1386166204.705445516]: Full control cycle time: 0.027409982

[DEBUG] [1386166204.777927638]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.779469173]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166204.790713341]: In controlling state.
[ WARN] [1386166204.799236284]: Could not transform the global plan to the frame of the controller
[DEBUG] [1386166204.802767947]: The local planner could not find a valid plan.
[DEBUG] [1386166204.804277915]: Planning...
[DEBUG] [1386166204.806757562]: Full control cycle time: 0.029080164

[DEBUG] [1386166204.877208489]: Got Plan with 49 points!
[DEBUG] [1386166204.878977430]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.879146725]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166204.879352897]: Waiting for plan, in the planning state.
[DEBUG] [1386166204.879506199]: Full control cycle time: 0.002110815

[DEBUG] [1386166204.884773975]: Generated a plan from the base_global_planner
[DEBUG] [1386166204.886034821]: Planner thread is suspending
[DEBUG] [1386166204.977587453]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166204.977886654]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166204.978173771]: Got a new plan...swap pointers
[DEBUG] [1386166204.978476044]: pointers swapped!
[ INFO] [1386166204.978669994]: Got new plan
[DEBUG] [1386166204.978856819]: In controlling state.
[DEBUG] [1386166205.017628512]: Got a valid command from the local planner: 0.448, 0.000, 1.812
[DEBUG] [1386166205.018593509]: Full control cycle time: 0.040484062

[DEBUG] [1386166205.077536129]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.077705983]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.077902098]: In controlling state.
[DEBUG] [1386166205.117635921]: Got a valid command from the local planner: 0.266, 0.000, 2.063
[DEBUG] [1386166205.118555451]: Full control cycle time: 0.040495094

[DEBUG] [1386166205.177749432]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.179715326]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.185337546]: In controlling state.
[DEBUG] [1386166205.230841448]: Got a valid command from the local planner: 0.397, 0.000, 2.072
[DEBUG] [1386166205.232476503]: Full control cycle time: 0.054954404

[DEBUG] [1386166205.281725014]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.282137427]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.285275257]: In controlling state.
[DEBUG] [1386166205.324930439]: Got a valid command from the local planner: 0.333, 0.000, 1.935
[DEBUG] [1386166205.325334959]: Full control cycle time: 0.043936313

[DEBUG] [1386166205.377754753]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.400018545]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.403311982]: In controlling state.
[DEBUG] [1386166205.434306499]: Got a valid command from the local planner: 0.500, 0.000, 1.819
[DEBUG] [1386166205.434547731]: Full control cycle time: 0.057089105

[DEBUG] [1386166205.478460574]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.480680196]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.487263089]: In controlling state.
[DEBUG] [1386166205.526915895]: Got a valid command from the local planner: 0.500, 0.000, 1.819
[DEBUG] [1386166205.529046611]: Full control cycle time: 0.050830132

[DEBUG] [1386166205.577675708]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.578052571]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.581128380]: In controlling state.
[DEBUG] [1386166205.637572985]: Got a valid command from the local planner: 0.195, 0.000, -2.543
[DEBUG] [1386166205.639640568]: Full control cycle time: 0.062151475

[DEBUG] [1386166205.677513544]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.678263639]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.681451196]: In controlling state.
[DEBUG] [1386166205.727866873]: Got a valid command from the local planner: 0.500, 0.000, -3.059
[DEBUG] [1386166205.730029437]: Full control cycle time: 0.052604942

[DEBUG] [1386166205.780110809]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.794376448]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.796889897]: In controlling state.
[DEBUG] [1386166205.830207541]: Got a valid command from the local planner: 0.152, 0.000, -2.778
[DEBUG] [1386166205.831599686]: Full control cycle time: 0.050707284

[DEBUG] [1386166205.877740193]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.879729759]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.884120613]: In controlling state.
[DEBUG] [1386166205.937035721]: Got a valid command from the local planner: 0.038, 0.000, -2.498
[DEBUG] [1386166205.937388280]: Full control cycle time: 0.059935484

[DEBUG] [1386166205.977746411]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166205.978260444]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166205.978659377]: In controlling state.
[DEBUG] [1386166206.023969471]: Got a valid command from the local planner: 0.108, 0.000, -2.564
[DEBUG] [1386166206.025671223]: Full control cycle time: 0.048180431

[DEBUG] [1386166206.077568603]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.079011246]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.090116010]: In controlling state.
[DEBUG] [1386166206.119367495]: Got a valid command from the local planner: -0.130, 0.000, 1.822
[DEBUG] [1386166206.120285489]: Full control cycle time: 0.042222758

[DEBUG] [1386166206.177683082]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.182863279]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.197095536]: In controlling state.
[DEBUG] [1386166206.212940568]: Got a valid command from the local planner: -0.198, 0.000, 1.442
[DEBUG] [1386166206.214603070]: Full control cycle time: 0.035785557

[DEBUG] [1386166206.277678969]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.284374863]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.296676079]: In controlling state.
[DEBUG] [1386166206.319835447]: Got a valid command from the local planner: 0.500, 0.000, -1.653
[DEBUG] [1386166206.321370140]: Full control cycle time: 0.042692021

[DEBUG] [1386166206.377575259]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.377766834]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.378720587]: In controlling state.
[DEBUG] [1386166206.413027463]: Got a valid command from the local planner: 0.500, 0.000, -1.745
[DEBUG] [1386166206.414450061]: Full control cycle time: 0.035884731

[DEBUG] [1386166206.477536506]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.477800296]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.477999414]: In controlling state.
[DEBUG] [1386166206.512341491]: Got a valid command from the local planner: 0.500, 0.000, -1.800
[DEBUG] [1386166206.515639114]: Full control cycle time: 0.037860399

[DEBUG] [1386166206.577530785]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.577707902]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.578704469]: In controlling state.
[DEBUG] [1386166206.619075733]: Got a valid command from the local planner: 0.500, 0.000, -1.625
[DEBUG] [1386166206.619376330]: Full control cycle time: 0.041916294

[DEBUG] [1386166206.678381670]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.678848279]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.679309161]: In controlling state.
[DEBUG] [1386166206.717656704]: Got a valid command from the local planner: 0.500, 0.000, -1.331
[DEBUG] [1386166206.717989707]: Full control cycle time: 0.039929237

[DEBUG] [1386166206.777679981]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.778062151]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.785956171]: In controlling state.
[DEBUG] [1386166206.828150085]: Got a valid command from the local planner: 0.500, 0.000, -1.237
[DEBUG] [1386166206.829181222]: Full control cycle time: 0.050999570

[DEBUG] [1386166206.877526477]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.878493218]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.880053119]: In controlling state.
[DEBUG] [1386166206.915862917]: Got a valid command from the local planner: 0.500, 0.000, -1.524
[DEBUG] [1386166206.916878689]: Full control cycle time: 0.039424008

[DEBUG] [1386166206.978204362]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166206.979811901]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166206.992529931]: In controlling state.
[DEBUG] [1386166207.028332035]: Got a valid command from the local planner: 0.500, 0.000, -2.383
[DEBUG] [1386166207.029387966]: Full control cycle time: 0.050805903

[DEBUG] [1386166207.077680283]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166207.078072371]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166207.093392754]: In controlling state.
[ WARN] [1386166207.099315434]: Could not transform the global plan to the frame of the controller
[DEBUG] [1386166207.101504469]: The local planner could not find a valid plan.
[DEBUG] [1386166207.101739345]: Planning...
[DEBUG] [1386166207.107393974]: Full control cycle time: 0.029821387

[DEBUG] [1386166207.167421509]: Got Plan with 54 points!
[DEBUG] [1386166207.167596461]: Generated a plan from the base_global_planner
[DEBUG] [1386166207.167711420]: Planner thread is suspending
[DEBUG] [1386166207.177533339]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166207.177852095]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166207.178045695]: Got a new plan...swap pointers
[DEBUG] [1386166207.178153530]: pointers swapped!
[ INFO] [1386166207.178254660]: Got new plan
[DEBUG] [1386166207.178382330]: In controlling state.
[DEBUG] [1386166207.218677960]: Got a valid command from the local planner: 0.500, 0.000, -2.453
[DEBUG] [1386166207.219088626]: Full control cycle time: 0.041611440

[DEBUG] [1386166207.277684346]: Publishing feedback for goal, id: /waypoint_management_node-1-1386166204.372833387, stamp: 1386166204.37
[DEBUG] [1386166207.278083839]: Publishing feedback for goal with id: /waypoint_management_node-1-1386166204.372833387 and stamp: 1386166204.37
[DEBUG] [1386166207.278807744]: In controlling state.
[DEBUG] [1386166207.325121383]: Got a valid command from the local planner: 0.500, 0.000, -2.205
[DEBUG] [1386166207.328377944]: Full control cycle time: 0.050748982
FROM CONSOLE:
[ERROR] [1386166204.794600431]: Extrapolation Error: Lookup would require extrapolation into the future.  Requested time 1386166204.760608679 but the latest data is at time 1386166204.681006934, when looking up transform from frame [local] to frame [global]

[ERROR] [1386166204.798496177]: Global Frame: local Plan Frame size 49: global

[ERROR] [1386166204.801676467]: Could not get local plan
[ERROR] [1386166207.094102621]: Extrapolation Error: Lookup would require extrapolation into the future.  Requested time 1386166207.060895396 but the latest data is at time 1386166206.992936965, when looking up transform from frame [local] to frame [global]

[ERROR] [1386166207.098096425]: Global Frame: local Plan Frame size 49: global

[ERROR] [1386166207.101307796]: Could not get local plan
[ERROR] [1386166208.600555921]: Extrapolation Error: Lookup would require extrapolation into the future.  Requested time 1386166208.560276359 but the latest data is at time 1386166208.477921333, when looking up transform from frame [local] to frame [global]

[ERROR] [1386166208.605807498]: Global Frame: local Plan Frame size 54: global

[ERROR] [1386166208.608851947]: Could not get local plan
[ERROR] [1386166210.296415706]: Extrapolation Error: Lookup would require extrapolation into the future.  Requested time 1386166210.259930623 but the latest data is at time 1386166210.184060640, when looking up transform from frame [local] to frame [global]

[ERROR] [1386166210.299559126]: Global Frame: local Plan Frame size 53: global

[ERROR] [1386166210.305595433]: Could not get local plan
[ERROR] [1386166211.594665718]: Extrapolation Error: Lookup would require extrapolation into the future.  Requested time 1386166211.560573392 but the latest data is at time 1386166211.480167357, when looking up transform from frame [local] to frame [global]

[ERROR] [1386166211.597373393]: Global Frame: local Plan Frame size 56: global

[ERROR] [1386166211.601120168]: Could not get local plan
Originally posted
by
robotiqsguy
on ROS Answers with karma: 21 on 2013-12-04
Post score: 1

### Verified Solution & Technical Diagnosis:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

Well, the code requests transformPose with time t_b of the latest base pose. If you publish at different places of your node, time t_g of global would e.g. have a slightly earlier timestamp - and tf must fail. Same thing if one of the other tf-messages has not been received yet. Unless you enable extrapolation, this is how tf(2) should behave.
In amcl - which would typically publish the map->odom or world->local transform - they timestamp the transform with 0.2s in the future. Maybe that's also a solution for you?
Originally posted by
Niccer
with karma: 46 on 2013-12-12
This answer was
ACCEPTED
on the original site
Post score: 2
Original comments
Comment by
robotiqsguy
on 2013-12-12
:
We timestamp our local and global transforms with the same time. They are being published in the same sendTransform since we use a vector of transforms. I assume upon receiving a vector that access to tf is locked, so if one transform is in tf the other one would be too. Transforms are sent at 20Hz.
Comment by
Niccer
on 2013-12-17
:
Maybe it helps to dump all the frames that are in your tf instance? There is the getFrames method - not sure if it prints the timestamps though.
Comment by
robotiqsguy
on 2013-12-17
:
HI Niccer, I'm noobie to ROS, so please keep the suggestions coming. This is an intermittent problem. After the change I made to send a vector of Transforms the problem happens much less. But it still happens. I wish there were some good tools for online debugging of TF2 problems.
Comment by
robotiqsguy
on 2013-12-17
:
To debug this problem I was thinking of pushing values on to the error_string. That way it would only get printed when an error happens.
Comment by
tfoote
on 2013-12-17
:
There are debugging tutorials here:

and feel free to put debugging code in whereever you need.

---

## Case 6: [ROS2] How to query Quality of Service (QoS) Parameters from Command line
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

- **Target Fault Domain:** `Topic Dropout`
- **Tags:** `ros2`
- **Community Score:** 0 votes
- **Original Thread:** [[ROS2] How to query Quality of Service (QoS) Parameters from Command line](

### Symptom & Problem:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

Is there a way to query the quality of service (QoS) parameters for ROS2 topics from the command line?  Without the ability to query the QoS from the command line, users have to read the source code that created publishers or subscribers. This isn't a good option in the long run. I've run into mismatched QoS parameters when using NAV2, RVIZ2 and robot_state_publisher because they use custom QoS parameters; thus, messages are not received without any ability to debug the problem. I've read about new users' frustrations with ROS2 on GitHub issues because the QoS parameters are opaque.
I understand exposing the QoS parameters through the rclpy and rclcpp APIs is probably tedious, not fun, and maybe no one is paying for it. Is there a workaround (besides reading source code)?
There was one question about this feature years ago, but it has been ignored:

Originally posted
by
Kevin DeMarco
on ROS Answers with karma: 88 on 2021-02-02
Post score: 1

### Verified Solution & Technical Diagnosis:
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->

Isn't this output by
ros2 topic info --verbose
?
From the usage text:
--verbose, -v  Prints detailed information like the node name, node namespace, topic type, GUID and QoS Profile of the publishers and subscribers to this topic
Originally posted by
gvdhoorn
with karma: 86574 on 2021-02-02
This answer was
ACCEPTED
on the original site
Post score: 2
Original comments
Comment by
Kevin DeMarco
on 2021-02-02
:
Thanks, that's what I was looking for! I am going to see if I can add this to the ROS2 tutorial documentation.
Comment by
rugved
on 2021-07-12
:
Is it not available for ros2 dashing? For the it says --verbose argument not recognized
Comment by
gvdhoorn
on 2021-07-13
:
No, I don't believe it is.
The OP also asked about Foxy.

---
