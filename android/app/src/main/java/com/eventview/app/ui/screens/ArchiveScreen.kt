package com.eventview.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.eventview.app.ui.components.EvCard
import com.eventview.app.ui.components.EvSecondaryButton
import com.eventview.app.ui.components.Kicker
import com.eventview.app.ui.theme.EvBg
import com.eventview.app.ui.theme.EvFg
import com.eventview.app.ui.theme.LocalEvColors
import com.eventview.app.util.EventViewWindow
import com.eventview.app.util.formatDuration
import com.eventview.app.util.formatWhen
import com.eventview.core.ArchiveSession
import com.eventview.core.LiveConfig

@Composable
fun ArchiveScreen(
    items: List<ArchiveSession>,
    window: EventViewWindow,
    onDelete: (String) -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val pad = if (window.isTablet) 28.dp else 16.dp
    Column(
        modifier
            .fillMaxSize()
            .background(EvBg)
            .padding(horizontal = pad)
            .padding(top = 16.dp),
    ) {
        Kicker(LiveConfig.PRODUCT_NAME)
        Text("Archive", style = MaterialTheme.typography.displayMedium, color = EvFg)
        Text(
            "Lives you stop on this phone land here — time, length, and how many people were watching.",
            style = MaterialTheme.typography.bodyMedium,
            color = LocalEvColors.current.muted,
            modifier = Modifier.padding(top = 6.dp, bottom = 16.dp),
        )
        if (items.isEmpty()) {
            EvCard {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Nothing saved yet", style = MaterialTheme.typography.titleLarge, color = EvFg)
                    Text(
                        "Go live from the Live tab. When you stop, this phone keeps a session card. Video files stay with Android’s own recorder if you start one.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = LocalEvColors.current.muted,
                    )
                    EvSecondaryButton("Share EventView invite", onClick = onShare)
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(items, key = { it.id }) { row ->
                    EvCard {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(row.title, style = MaterialTheme.typography.titleLarge, color = EvFg)
                            Text(
                                "${formatWhen(row.startedAt)} · ${formatDuration(row.durationMs)} · ${row.peakViewers} watching peak",
                                style = MaterialTheme.typography.bodyMedium,
                                color = LocalEvColors.current.muted,
                            )
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                EvSecondaryButton("Share invite", onClick = onShare)
                                EvSecondaryButton("Remove", onClick = { onDelete(row.id) })
                            }
                        }
                    }
                }
            }
        }
    }
}
