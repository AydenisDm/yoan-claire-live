package com.eventview.core

data class ChatOption(val id: String, val label: String)

data class ChatLine(
    val from: String,
    val id: String,
    val label: String,
    val at: Long,
)

data class FeedbackOption(val id: String, val label: String)

data class FeedbackGroup(
    val kind: String,
    val title: String,
    val options: List<FeedbackOption>,
)

/** Mirrors `src/lib/crowd.ts` — chat rides LiveKit data messages `{ t, v }`. */
object Crowd {
    val chatOptions: List<ChatOption> = listOf(
        ChatOption("love", "Love this"),
        ChatOption("beautiful", "So beautiful"),
        ChatOption("wow", "Wow"),
        ChatOption("withyou", "We're with you"),
        ChatOption("cheers", "Cheers"),
        ChatOption("clap", "Clapping"),
    )

    val feedbackGroups: List<FeedbackGroup> = listOf(
        FeedbackGroup(
            kind = "picture",
            title = "Picture",
            options = listOf(
                FeedbackOption("clear", "Clear"),
                FeedbackOption("soft", "A bit soft"),
                FeedbackOption("stuck", "Freezing"),
            ),
        ),
        FeedbackGroup(
            kind = "sound",
            title = "Sound",
            options = listOf(
                FeedbackOption("clear", "Clear"),
                FeedbackOption("quiet", "Too quiet"),
                FeedbackOption("none", "No sound"),
            ),
        ),
        FeedbackGroup(
            kind = "moment",
            title = "The stream",
            options = listOf(
                FeedbackOption("great", "Great"),
                FeedbackOption("moving", "Moving"),
                FeedbackOption("issues", "Having issues"),
            ),
        ),
    )

    private val chatById = chatOptions.associate { it.id to it.label }
    private val feedbackOk = feedbackGroups.associate { group ->
        group.kind to group.options.map { it.id }.toSet()
    }

    fun chatLabel(id: String): String? = chatById[id]

    fun isChatId(id: String): Boolean = chatById.containsKey(id)

    fun isFeedbackChoice(kind: String, choice: String): Boolean {
        return feedbackOk[kind]?.contains(choice) == true
    }

    fun isPictureTrouble(choice: String): Boolean = choice == "soft" || choice == "stuck"

    fun isSoundTrouble(choice: String): Boolean = choice == "quiet" || choice == "none"
}

data class LiveDataMessage(val t: String, val v: String)

object LiveData {
    fun encode(type: String, value: String): String = """{"t":"$type","v":"$value"}"""

    fun parse(raw: String): LiveDataMessage? {
        val t = Regex("\"t\"\\s*:\\s*\"([^\"]+)\"").find(raw)?.groupValues?.getOrNull(1) ?: return null
        val v = Regex("\"v\"\\s*:\\s*\"([^\"]+)\"").find(raw)?.groupValues?.getOrNull(1) ?: return null
        return LiveDataMessage(t, v)
    }
}
